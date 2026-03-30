import { MatchmakingQueueStore } from './matchmaking-queue.store';

describe('MatchmakingQueueStore', () => {
  const redis = {
    del: jest.fn(),
    get: jest.fn(),
    rename: jest.fn(),
    type: jest.fn(),
    zAdd: jest.fn(),
    zAddMany: jest.fn(),
    zCard: jest.fn(),
    zRange: jest.fn(),
    zRem: jest.fn(),
    zScore: jest.fn(),
  };

  let store: MatchmakingQueueStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new MatchmakingQueueStore(redis as any);
  });

  it('migrates a legacy JSON queue into a zset while preserving order', async () => {
    redis.type.mockResolvedValue('string');
    redis.get.mockResolvedValue(JSON.stringify(['player-1', 'player-2']));

    await store.ensureQueueCompatible();

    expect(redis.rename).toHaveBeenCalledWith(
      'matchmaking:queue',
      expect.stringMatching(/^matchmaking:queue:legacy:/),
    );
    expect(redis.zAddMany).toHaveBeenCalledWith('matchmaking:queue', [
      { score: 1, member: 'player-1' },
      { score: 2, member: 'player-2' },
    ]);
    expect(redis.del).toHaveBeenCalledWith(expect.stringMatching(/^matchmaking:queue:legacy:/));
  });

  it('keeps a backup and resets the queue when the legacy payload is invalid', async () => {
    redis.type.mockResolvedValue('string');
    redis.get.mockResolvedValue('not-json');

    await store.ensureQueueCompatible();

    expect(redis.rename).toHaveBeenCalledTimes(1);
    expect(redis.zAddMany).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('backs up unsupported Redis types without trying to parse them', async () => {
    redis.type.mockResolvedValue('list');

    await store.ensureQueueCompatible();

    expect(redis.rename).toHaveBeenCalledTimes(1);
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.zAddMany).not.toHaveBeenCalled();
  });

  it('leaves an existing zset untouched', async () => {
    redis.type.mockResolvedValue('zset');

    await store.ensureQueueCompatible();

    expect(redis.rename).not.toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
  });
});
