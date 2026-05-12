import type { HubChatMessage } from '@game/shared-types';
import { HUB_CHAT_HISTORY_LIMIT } from '@game/shared-types';

import { makeRedisMock, type RedisMock } from '../test/mocks/redis.mock';

import { HubChatRepository } from './hub-chat.repository';

describe('HubChatRepository', () => {
  let redis: RedisMock;
  let repo: HubChatRepository;

  const message = (overrides: Partial<HubChatMessage> = {}): HubChatMessage => ({
    id: 'm1',
    playerId: 'p1',
    username: 'Alice',
    text: 'hello',
    sentAt: 1000,
    ...overrides,
  });

  beforeEach(() => {
    redis = makeRedisMock();
    repo = new HubChatRepository(redis as unknown as never);
  });

  it('returns an empty list when no messages stored', async () => {
    expect(await repo.list()).toEqual([]);
  });

  it('appends a message and returns it from list', async () => {
    const m = message();
    await repo.append(m);

    expect(await repo.list()).toEqual([m]);
  });

  it('preserves chronological order across multiple appends', async () => {
    const m1 = message({ id: 'm1', sentAt: 1 });
    const m2 = message({ id: 'm2', sentAt: 2 });
    const m3 = message({ id: 'm3', sentAt: 3 });
    await repo.append(m1);
    await repo.append(m2);
    await repo.append(m3);

    expect((await repo.list()).map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it(`caps history at ${HUB_CHAT_HISTORY_LIMIT} entries by dropping oldest`, async () => {
    for (let i = 0; i < HUB_CHAT_HISTORY_LIMIT + 5; i += 1) {
      await repo.append(message({ id: `m${i}`, sentAt: i }));
    }
    const stored = await repo.list();

    expect(stored).toHaveLength(HUB_CHAT_HISTORY_LIMIT);
    expect(stored[0].id).toBe('m5');
    expect(stored[stored.length - 1].id).toBe(`m${HUB_CHAT_HISTORY_LIMIT + 4}`);
  });
});
