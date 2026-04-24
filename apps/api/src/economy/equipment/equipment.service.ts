import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { PrismaService } from '../../shared/prisma/prisma.service';

import { EquipmentSlotType } from '@game/shared-types';
import { PlayerSpellProjectionService } from '../../player/player-spell-projection.service';
import { StatsCalculatorService } from '../../player/stats-calculator.service';
import { PerfLoggerService } from '../../shared/perf/perf-logger.service';
import { GameSessionService } from '../../game-session/game-session.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GAME_EVENTS } from '@game/shared-types';

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsCalculator: StatsCalculatorService,
    private readonly playerSpellProjection: PlayerSpellProjectionService,
    private readonly perfLogger: PerfLoggerService,
    private readonly gameSession: GameSessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getEquipment(playerId: string) {
    const slots = await this.prisma.equipmentSlot.findMany({
      where: { playerId },
      include: {
        inventoryItem: {
          include: {
            item: true,
          },
        },
        sessionItem: {
          include: {
            item: true,
          },
        },
      },
    });

    const equipment: Record<string, any> = {};
    Object.values(EquipmentSlotType).forEach((slot: any) => {
      const row = slots.find((s: any) => s.slot === slot);
      if (row?.inventoryItem) {
        equipment[slot] = row.inventoryItem;
      } else if (row?.sessionItem) {
        const si = row.sessionItem;
        equipment[slot] = {
          id: si.id,
          playerId: si.playerId,
          itemId: si.itemId,
          quantity: si.quantity,
          rank: 1,
          item: si.item,
        };
      } else {
        equipment[slot] = null;
      }
    });

    return equipment;
  }

  /** inventoryItemId ou id de SessionItem (même clé API) */
  async equip(playerId: string, inventoryItemId: string, slot: EquipmentSlotType) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, playerId },
        include: { item: true },
      });

      if (inv) {
        this.validateSlotCompatibility(inv.item.type, slot);

        // Split stack if quantity > 1
        let itemToEquipId = inventoryItemId;
        if (inv.quantity > 1) {
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantity: { decrement: 1 } },
          });
          const newItem = await tx.inventoryItem.create({
            data: {
              playerId,
              itemId: inv.itemId,
              quantity: 1,
              rank: inv.rank,
            },
          });
          itemToEquipId = newItem.id;
        }

        // Clean up any existing slot for this item (shouldn't happen with split, but for safety)
        const existingSlotForItem = await tx.equipmentSlot.findFirst({
          where: { playerId, inventoryItemId: itemToEquipId, NOT: { slot } },
        });

        if (existingSlotForItem) {
          await tx.equipmentSlot.update({
            where: { id: existingSlotForItem.id },
            data: { inventoryItemId: null, sessionItemId: null },
          });
        }

        await tx.equipmentSlot.upsert({
          where: { playerId_slot: { playerId, slot } },
          create: { playerId, slot, inventoryItemId: itemToEquipId, sessionItemId: null },
          update: { inventoryItemId: itemToEquipId, sessionItemId: null },
        });

        this.eventEmitter.emit(GAME_EVENTS.ITEM_EQUIPPED, { playerId, inventoryItemId: itemToEquipId, slot });
        return this.updatePlayerStatsAndSpellsInTransaction(tx, playerId);
      }

      // Handle Session Items
      const gs = await this.gameSession.getActiveSession(playerId);
      if (!gs) throw new NotFoundException('Item non trouvé');

      const si = await tx.sessionItem.findFirst({
        where: { id: inventoryItemId, playerId, sessionId: gs.id },
        include: { item: true },
      });

      if (!si) throw new NotFoundException('Item non trouvé');

      this.validateSlotCompatibility(si.item.type, slot);

      // Split stack for session items
      let sessionItemToEquipId = inventoryItemId;
      if (si.quantity > 1) {
        await tx.sessionItem.update({
          where: { id: si.id },
          data: { quantity: { decrement: 1 } },
        });
        const newItem = await tx.sessionItem.create({
          data: {
            sessionId: gs.id,
            playerId,
            itemId: si.itemId,
            quantity: 1,
          },
        });
        sessionItemToEquipId = newItem.id;
      }

      await tx.equipmentSlot.upsert({
        where: { playerId_slot: { playerId, slot } },
        create: { playerId, slot, sessionItemId: sessionItemToEquipId, inventoryItemId: null },
        update: { sessionItemId: sessionItemToEquipId, inventoryItemId: null },
      });

      this.eventEmitter.emit(GAME_EVENTS.ITEM_EQUIPPED, { playerId, inventoryItemId: sessionItemToEquipId, slot });
      return this.updatePlayerStatsAndSpellsInTransaction(tx, playerId);
    });
  }

  async unequip(playerId: string, slot: EquipmentSlotType) {
    return this.prisma.$transaction(async (tx) => {
      const currentSlot = await tx.equipmentSlot.findUnique({
        where: { playerId_slot: { playerId, slot } },
      });

      if (!currentSlot) return this.getEquipment(playerId);

      // Handle merge back for inventory items
      if (currentSlot.inventoryItemId) {
        const inv = await tx.inventoryItem.findUnique({
          where: { id: currentSlot.inventoryItemId },
        });
        if (inv) {
          const targetStack = await tx.inventoryItem.findFirst({
            where: { 
              playerId, 
              itemId: inv.itemId, 
              rank: inv.rank, 
              NOT: { id: inv.id },
              equipmentSlot: { is: null }
            },
          });

          if (targetStack) {
            await tx.inventoryItem.update({
              where: { id: targetStack.id },
              data: { quantity: { increment: 1 } },
            });
            await tx.inventoryItem.delete({ where: { id: inv.id } });
          }
        }
      }

      // Handle merge back for session items
      if (currentSlot.sessionItemId) {
        const si = await tx.sessionItem.findFirst({
          where: { id: currentSlot.sessionItemId },
        });
        if (si) {
          const targetStack = await tx.sessionItem.findFirst({
            where: { 
              sessionId: si.sessionId, 
              playerId, 
              itemId: si.itemId, 
              NOT: { id: si.id },
              equipmentSlot: { is: null }
            },
          });

          if (targetStack) {
            await tx.sessionItem.update({
              where: { id: targetStack.id },
              data: { quantity: { increment: 1 } },
            });
            await tx.sessionItem.delete({ where: { id: si.id } });
          }
        }
      }

      await tx.equipmentSlot.update({
        where: { playerId_slot: { playerId, slot } },
        data: { inventoryItemId: null, sessionItemId: null },
      });

      this.eventEmitter.emit(GAME_EVENTS.ITEM_UNEQUIPPED, { playerId, slot });
      return this.updatePlayerStatsAndSpellsInTransaction(tx, playerId);
    });
  }

  private async updatePlayerStatsAndSpellsInTransaction(tx: any, playerId: string) {
    const startedAt = performance.now();
    const [stats, playerSpellsData] = await Promise.all([
      this.statsCalculator.computeEffectiveStats(playerId), // TODO: update calculator to use tx if needed, currently it reads from Prisma
      this.playerSpellProjection.buildPlayerSpellAssignments(playerId),
    ]);

    await tx.playerStats.update({
      where: { playerId },
      data: stats,
    });

    await tx.playerSpell.deleteMany({
      where: { playerId },
    });

    if (playerSpellsData.length > 0) {
      await tx.playerSpell.createMany({
        data: playerSpellsData,
      });
    }

    this.perfLogger.logDuration('player', 'equipment.recompute', performance.now() - startedAt, {
      player_id: playerId,
      spell_count: playerSpellsData.length,
    });

    this.eventEmitter.emit(GAME_EVENTS.SPELLS_CHANGED, { playerId, spellsDecks: playerSpellsData });

    return this.getEquipment(playerId);
  }

  private async updatePlayerStatsAndSpells(playerId: string) {
    // This is now a wrapper for the transactional version or kept for compatibility
    return this.prisma.$transaction(tx => this.updatePlayerStatsAndSpellsInTransaction(tx, playerId));
  }

  private validateSlotCompatibility(itemType: string, slot: EquipmentSlotType) {
    const validSlots: Record<string, EquipmentSlotType[]> = {
      WEAPON: [EquipmentSlotType.WEAPON_LEFT, EquipmentSlotType.WEAPON_RIGHT],
      ARMOR_HEAD: [EquipmentSlotType.ARMOR_HEAD],
      ARMOR_CHEST: [EquipmentSlotType.ARMOR_CHEST],
      ARMOR_LEGS: [EquipmentSlotType.ARMOR_LEGS],
      ACCESSORY: [EquipmentSlotType.ACCESSORY],
    };

    if (!validSlots[itemType]?.includes(slot)) {
      throw new BadRequestException(
        `L'item de type ${itemType} ne peut pas être équipé dans le slot ${slot}`,
      );
    }
  }
}
