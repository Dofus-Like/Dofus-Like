import Redis from 'ioredis';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';

const REDIS_IMAGE = 'redis:7-alpine';

export interface TestRedisContext {
  client: Redis;
  stop: () => Promise<void>;
}

export async function createTestRedisClient(): Promise<TestRedisContext> {
  const container: StartedRedisContainer = await new RedisContainer(REDIS_IMAGE).start();
  const client = new Redis(container.getConnectionUrl());
  return {
    client,
    stop: async () => {
      client.disconnect();
      await container.stop();
    },
  };
}
