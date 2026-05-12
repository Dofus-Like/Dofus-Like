import { Injectable } from '@nestjs/common';
import { HUB_PRESENCE_TTL_SECONDS, type HubPlayerSnapshot } from '@game/shared-types';

import { RedisService } from '../shared/redis/redis.service';

const KEY_PREFIX = 'hub:presence';

function keyOf(playerId: string): string {
  return `${KEY_PREFIX}:${playerId}`;
}

@Injectable()
export class HubPresenceRepository {
  constructor(private readonly redis: RedisService) {}

  async upsert(snapshot: HubPlayerSnapshot): Promise<void> {
    await this.redis.setJson(keyOf(snapshot.playerId), snapshot, HUB_PRESENCE_TTL_SECONDS);
  }

  async get(playerId: string): Promise<HubPlayerSnapshot | null> {
    return this.redis.getJson<HubPlayerSnapshot>(keyOf(playerId));
  }

  async remove(playerId: string): Promise<void> {
    await this.redis.del(keyOf(playerId));
  }

  async list(): Promise<HubPlayerSnapshot[]> {
    const keys = await this.redis.keys(`${KEY_PREFIX}:*`);
    if (keys.length === 0) return [];
    const snapshots = await Promise.all(keys.map((key) => this.redis.getJson<HubPlayerSnapshot>(key)));
    return snapshots.filter((snap): snap is HubPlayerSnapshot => snap !== null);
  }
}
