import { Injectable } from '@nestjs/common';
import { HUB_CHAT_HISTORY_LIMIT, type HubChatMessage } from '@game/shared-types';

import { RedisService } from '../shared/redis/redis.service';

const HISTORY_KEY = 'hub:chat:history';

@Injectable()
export class HubChatRepository {
  constructor(private readonly redis: RedisService) {}

  async list(): Promise<HubChatMessage[]> {
    const stored = await this.redis.getJson<HubChatMessage[]>(HISTORY_KEY);
    return stored ?? [];
  }

  async append(message: HubChatMessage): Promise<void> {
    const current = await this.list();
    current.push(message);
    const trimmed = current.length > HUB_CHAT_HISTORY_LIMIT
      ? current.slice(current.length - HUB_CHAT_HISTORY_LIMIT)
      : current;
    await this.redis.setJson(HISTORY_KEY, trimmed);
  }
}
