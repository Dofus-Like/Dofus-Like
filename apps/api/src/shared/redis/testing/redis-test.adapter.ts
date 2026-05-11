import type Redis from 'ioredis';

/**
 * Lightweight adapter that maps RedisService's interface to a raw ioredis client.
 * Used in integration tests in place of the full RedisService (which pulls in perf deps).
 */
export class RedisTestAdapter {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async type(key: string): Promise<string> {
    return this.client.type(key);
  }

  async rename(key: string, newKey: string): Promise<void> {
    await this.client.rename(key, newKey);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async zAdd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zAddMany(key: string, entries: Array<{ score: number; member: string }>): Promise<void> {
    if (entries.length === 0) return;
    const args = entries.flatMap((e) => [e.score, e.member]);
    await this.client.zadd(key, ...args);
  }

  async zRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  async zRem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return this.client.zrem(key, ...members);
  }

  async zScore(key: string, member: string): Promise<number | null> {
    const score = await this.client.zscore(key, member);
    return score == null ? null : Number(score);
  }

  async zCard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  async setIfNotExists(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const response = ttlSeconds
      ? await this.client.set(key, value, 'EX', ttlSeconds, 'NX')
      : await this.client.set(key, value, 'NX');
    return response === 'OK';
  }
}
