import { RedisContainer } from '@testcontainers/redis';
import type { StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

import { RedisTestAdapter } from '../redis/testing/redis-test.adapter';
import { MATCHMAKING_QUEUE_KEY } from './security.constants';

import { MatchmakingQueueStore } from './matchmaking-queue.store';

describe('MatchmakingQueueStore (integration)', () => {
  let container: StartedRedisContainer;
  let client: Redis;
  let store: MatchmakingQueueStore;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    client = new Redis(container.getConnectionUrl());
  }, 60_000);

  afterAll(async () => {
    client.disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await client.flushdb();
    store = new MatchmakingQueueStore(new RedisTestAdapter(client) as never);
  });

  it('migrates a legacy JSON queue into a zset while preserving order', async () => {
    await client.set(MATCHMAKING_QUEUE_KEY, JSON.stringify(['player-1', 'player-2']));

    await store.ensureQueueCompatible();

    expect(await client.type(MATCHMAKING_QUEUE_KEY)).toBe('zset');
    const backup = await findBackupKey(client);
    expect(backup).toBeNull();

    const members = await client.zrange(MATCHMAKING_QUEUE_KEY, 0, -1, 'WITHSCORES');
    expect(members).toEqual(['player-1', '1', 'player-2', '2']);
  });

  it('backs up and clears queue when legacy payload is invalid JSON', async () => {
    await client.set(MATCHMAKING_QUEUE_KEY, 'not-json');

    await store.ensureQueueCompatible();

    expect(await client.exists(MATCHMAKING_QUEUE_KEY)).toBe(0);
    const backup = await findBackupKey(client);
    expect(backup).not.toBeNull();
    expect(await client.get(backup!)).toBe('not-json');
  });

  it('backs up unsupported Redis types without parsing', async () => {
    await client.rpush(MATCHMAKING_QUEUE_KEY, 'item-1');

    await store.ensureQueueCompatible();

    expect(await client.exists(MATCHMAKING_QUEUE_KEY)).toBe(0);
    const backup = await findBackupKey(client);
    expect(backup).not.toBeNull();
  });

  it('leaves an existing zset untouched', async () => {
    await client.zadd(MATCHMAKING_QUEUE_KEY, 1, 'player-1');

    await store.ensureQueueCompatible();

    expect(await client.zrange(MATCHMAKING_QUEUE_KEY, 0, -1)).toEqual(['player-1']);
  });

  it('round-trips add/remove/size/range correctly', async () => {
    await store.add('player-1', 1);
    await store.add('player-2', 2);

    expect(await store.size()).toBe(2);
    expect(await store.range(0, -1)).toEqual(['player-1', 'player-2']);
    expect(await store.isQueued('player-1')).toBe(true);

    await store.remove('player-1');

    expect(await store.size()).toBe(1);
    expect(await store.isQueued('player-1')).toBe(false);
  });
});

async function findBackupKey(client: Redis): Promise<string | null> {
  const keys = await client.keys(`${MATCHMAKING_QUEUE_KEY}:legacy:*`);
  return keys[0] ?? null;
}

async function findZsetKey(client: Redis): Promise<string | null> {
  const keys = await client.keys('matchmaking:*');
  for (const key of keys) {
    if (await client.type(key) === 'zset') return key;
  }
  return null;
}
