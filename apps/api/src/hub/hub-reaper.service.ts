import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HUB_EVENTS, HUB_GLOBAL_CHANNEL, type HubLeavePayload } from '@game/shared-types';

import { SseService } from '../shared/sse/sse.service';

import { HubPresenceRepository } from './hub-presence.repository';

@Injectable()
export class HubReaperService {
  private readonly logger = new Logger(HubReaperService.name);
  private readonly knownPlayerIds = new Set<string>();
  private enabled = true;

  constructor(
    private readonly presence: HubPresenceRepository,
    private readonly sse: SseService,
  ) {}

  disable(): void {
    this.enabled = false;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async sweepStalePresence(): Promise<void> {
    if (!this.enabled) return;
    try {
      const active = await this.presence.list();
      const activeIds = new Set(active.map((s) => s.playerId));
      const gone: string[] = [];
      for (const id of this.knownPlayerIds) {
        if (!activeIds.has(id)) gone.push(id);
      }
      for (const id of gone) {
        this.knownPlayerIds.delete(id);
        const payload: HubLeavePayload = { playerId: id };
        this.sse.emit(HUB_GLOBAL_CHANNEL, HUB_EVENTS.PLAYER_LEAVE, payload);
        this.logger.log(`Reaped stale presence for ${id}`);
      }
      for (const id of activeIds) this.knownPlayerIds.add(id);
    } catch (error) {
      this.logger.warn(`Hub reaper sweep failed: ${(error as Error).message}`);
    }
  }
}
