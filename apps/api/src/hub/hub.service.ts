import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  HUB_EVENTS,
  HUB_GLOBAL_CHANNEL,
  type HubChatMessage,
  type HubChatPayload,
  type HubInitialState,
  type HubJoinPayload,
  type HubLeavePayload,
  type HubMovePayload,
  type HubPlayerSnapshot,
  type HubVector2,
} from '@game/shared-types';

import { PlayerService } from '../player/player.service';
import { SseService } from '../shared/sse/sse.service';

import { HubChatRepository } from './hub-chat.repository';
import { HubPresenceRepository } from './hub-presence.repository';

const DEFAULT_SPAWN: HubVector2 = { x: 0, z: 0 };

@Injectable()
export class HubService {
  constructor(
    private readonly sse: SseService,
    private readonly presence: HubPresenceRepository,
    private readonly chat: HubChatRepository,
    private readonly players: PlayerService,
  ) {}

  async join(playerId: string, username: string): Promise<HubInitialState> {
    const player = await this.players.findById(playerId);
    const skin = player?.skin ?? 'warrior';
    const existing = await this.presence.get(playerId);
    const snapshot: HubPlayerSnapshot = {
      playerId,
      username,
      skin,
      position: existing?.position ?? DEFAULT_SPAWN,
      target: existing?.target ?? null,
      updatedAt: Date.now(),
    };

    await this.presence.upsert(snapshot);
    const [players, chatHistory] = await Promise.all([this.presence.list(), this.chat.list()]);

    const joinPayload: HubJoinPayload = { player: snapshot };
    this.sse.emit(HUB_GLOBAL_CHANNEL, HUB_EVENTS.PLAYER_JOIN, joinPayload);

    return {
      self: snapshot,
      players: players.filter((p) => p.playerId !== playerId),
      chatHistory,
    };
  }

  async heartbeat(playerId: string): Promise<void> {
    const existing = await this.presence.get(playerId);
    if (!existing) return;
    await this.presence.upsert({ ...existing, updatedAt: Date.now() });
  }

  async moveTo(playerId: string, position: HubVector2, target: HubVector2): Promise<void> {
    const existing = await this.presence.get(playerId);
    if (!existing) return;
    const updatedAt = Date.now();
    const snapshot: HubPlayerSnapshot = { ...existing, position, target, updatedAt };
    await this.presence.upsert(snapshot);
    const payload: HubMovePayload = { playerId, position, target, updatedAt };
    this.sse.emit(HUB_GLOBAL_CHANNEL, HUB_EVENTS.PLAYER_MOVE, payload);
  }

  async sendChat(playerId: string, username: string, text: string): Promise<HubChatMessage> {
    const existing = await this.presence.get(playerId);
    if (!existing) throw new NotFoundException('Joueur absent du hub');
    const message: HubChatMessage = {
      id: randomUUID(),
      playerId,
      username,
      text,
      sentAt: Date.now(),
    };
    await this.chat.append(message);
    const payload: HubChatPayload = { message };
    this.sse.emit(HUB_GLOBAL_CHANNEL, HUB_EVENTS.CHAT_MESSAGE, payload);
    return message;
  }

  async leave(playerId: string): Promise<void> {
    await this.presence.remove(playerId);
    const payload: HubLeavePayload = { playerId };
    this.sse.emit(HUB_GLOBAL_CHANNEL, HUB_EVENTS.PLAYER_LEAVE, payload);
  }
}
