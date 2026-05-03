import type { HubPlayerSnapshot } from '@game/shared-types';
import { HUB_PRESENCE_TTL_SECONDS } from '@game/shared-types';

import { makeRedisMock, type RedisMock } from '../test/mocks/redis.mock';

import { HubPresenceRepository } from './hub-presence.repository';

describe('HubPresenceRepository', () => {
  let redis: RedisMock;
  let repo: HubPresenceRepository;

  const snapshot = (overrides: Partial<HubPlayerSnapshot> = {}): HubPlayerSnapshot => ({
    playerId: 'p1',
    username: 'Alice',
    skin: 'warrior',
    position: { x: 0, z: 0 },
    target: null,
    updatedAt: 1000,
    ...overrides,
  });

  beforeEach(() => {
    redis = makeRedisMock();
    repo = new HubPresenceRepository(redis as unknown as never);
  });

  it('persists a snapshot under hub:presence:<playerId> with TTL', async () => {
    const snap = snapshot();
    await repo.upsert(snap);

    expect(redis.setJson).toHaveBeenCalledWith('hub:presence:p1', snap, HUB_PRESENCE_TTL_SECONDS);
  });

  it('returns one snapshot per active player when listing', async () => {
    await repo.upsert(snapshot({ playerId: 'p1', username: 'Alice' }));
    await repo.upsert(snapshot({ playerId: 'p2', username: 'Bob' }));

    const all = await repo.list();

    expect(all).toHaveLength(2);
    expect(all.map((s) => s.playerId).sort()).toEqual(['p1', 'p2']);
  });

  it('returns null when fetching a missing player', async () => {
    expect(await repo.get('ghost')).toBeNull();
  });

  it('returns the persisted snapshot when fetching by id', async () => {
    const snap = snapshot({ playerId: 'p1', username: 'Alice' });
    await repo.upsert(snap);

    expect(await repo.get('p1')).toEqual(snap);
  });

  it('removes a snapshot on leave', async () => {
    await repo.upsert(snapshot({ playerId: 'p1' }));
    await repo.remove('p1');

    expect(await repo.get('p1')).toBeNull();
    expect(redis.del).toHaveBeenCalledWith('hub:presence:p1');
  });
});
