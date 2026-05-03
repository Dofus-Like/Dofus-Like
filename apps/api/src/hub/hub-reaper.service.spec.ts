import { HUB_EVENTS, HUB_GLOBAL_CHANNEL, type HubPlayerSnapshot } from '@game/shared-types';

import { HubReaperService } from './hub-reaper.service';

describe('HubReaperService', () => {
  const sse = { emit: jest.fn() };
  const presence = { list: jest.fn<Promise<HubPlayerSnapshot[]>, []>() };

  const snap = (id: string): HubPlayerSnapshot => ({
    playerId: id, username: id, skin: 'warrior',
    position: { x: 0, z: 0 }, target: null, updatedAt: 0,
  });

  let reaper: HubReaperService;

  beforeEach(() => {
    jest.clearAllMocks();
    reaper = new HubReaperService(presence as never, sse as never);
  });

  it('emits no LEAVE on the first sweep (nothing was known yet)', async () => {
    presence.list.mockResolvedValue([snap('p1'), snap('p2')]);
    await reaper.sweepStalePresence();
    expect(sse.emit).not.toHaveBeenCalled();
  });

  it('emits PLAYER_LEAVE for players that disappeared between two sweeps', async () => {
    presence.list.mockResolvedValueOnce([snap('p1'), snap('p2')]);
    await reaper.sweepStalePresence();
    presence.list.mockResolvedValueOnce([snap('p1')]);
    await reaper.sweepStalePresence();

    expect(sse.emit).toHaveBeenCalledTimes(1);
    expect(sse.emit).toHaveBeenCalledWith(
      HUB_GLOBAL_CHANNEL,
      HUB_EVENTS.PLAYER_LEAVE,
      { playerId: 'p2' },
    );
  });

  it('does not re-emit LEAVE for already-reaped players', async () => {
    presence.list.mockResolvedValueOnce([snap('p1')]);
    await reaper.sweepStalePresence();
    presence.list.mockResolvedValueOnce([]);
    await reaper.sweepStalePresence();
    presence.list.mockResolvedValueOnce([]);
    await reaper.sweepStalePresence();

    expect(sse.emit).toHaveBeenCalledTimes(1);
  });

  it('skips work when disabled', async () => {
    reaper.disable();
    presence.list.mockResolvedValueOnce([snap('p1')]);
    await reaper.sweepStalePresence();
    expect(presence.list).not.toHaveBeenCalled();
  });
});
