import {
  HUB_EVENTS,
  HUB_GLOBAL_CHANNEL,
  type HubChatMessage,
  type HubPlayerSnapshot,
} from '@game/shared-types';

import { HubService } from './hub.service';

describe('HubService', () => {
  const baseTime = 1_700_000_000_000;

  const sse = { emit: jest.fn() };

  const presence = {
    upsert: jest.fn<Promise<void>, [HubPlayerSnapshot]>(),
    get: jest.fn<Promise<HubPlayerSnapshot | null>, [string]>(),
    remove: jest.fn<Promise<void>, [string]>(),
    list: jest.fn<Promise<HubPlayerSnapshot[]>, []>(),
  };

  const chat = {
    list: jest.fn<Promise<HubChatMessage[]>, []>(),
    append: jest.fn<Promise<void>, [HubChatMessage]>(),
  };

  const players = {
    findById: jest.fn(),
  };

  let service: HubService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(baseTime);
    presence.list.mockResolvedValue([]);
    chat.list.mockResolvedValue([]);
    players.findById.mockResolvedValue({ id: 'p1', username: 'Alice', skin: 'warrior' });
    service = new HubService(
      sse as never,
      presence as never,
      chat as never,
      players as never,
    );
  });

  describe('join', () => {
    it('persists a fresh snapshot and broadcasts PLAYER_JOIN', async () => {
      const result = await service.join('p1', 'Alice');

      expect(presence.upsert).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 'p1',
        username: 'Alice',
        skin: 'warrior',
        target: null,
      }));
      expect(sse.emit).toHaveBeenCalledWith(
        HUB_GLOBAL_CHANNEL,
        HUB_EVENTS.PLAYER_JOIN,
        expect.objectContaining({ player: expect.objectContaining({ playerId: 'p1' }) }),
      );
      expect(result.self.playerId).toBe('p1');
    });

    it('returns the existing players and chat history in the initial state', async () => {
      const other: HubPlayerSnapshot = {
        playerId: 'p2', username: 'Bob', skin: 'mage',
        position: { x: 1, z: 2 }, target: null, updatedAt: baseTime - 1000,
      };
      const oldMsg: HubChatMessage = {
        id: 'm1', playerId: 'p2', username: 'Bob', text: 'hi', sentAt: baseTime - 500,
      };
      presence.list.mockResolvedValue([other]);
      chat.list.mockResolvedValue([oldMsg]);

      const result = await service.join('p1', 'Alice');

      expect(result.players).toEqual([other]);
      expect(result.chatHistory).toEqual([oldMsg]);
    });
  });

  describe('moveTo', () => {
    it('updates the snapshot with new position+target and broadcasts PLAYER_MOVE', async () => {
      const existing: HubPlayerSnapshot = {
        playerId: 'p1', username: 'Alice', skin: 'warrior',
        position: { x: 0, z: 0 }, target: null, updatedAt: baseTime - 100,
      };
      presence.get.mockResolvedValue(existing);

      await service.moveTo('p1', { x: 5, z: 3 }, { x: 10, z: 7 });

      expect(presence.upsert).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 'p1',
        position: { x: 5, z: 3 },
        target: { x: 10, z: 7 },
        updatedAt: baseTime,
      }));
      expect(sse.emit).toHaveBeenCalledWith(
        HUB_GLOBAL_CHANNEL,
        HUB_EVENTS.PLAYER_MOVE,
        expect.objectContaining({
          playerId: 'p1', position: { x: 5, z: 3 }, target: { x: 10, z: 7 },
        }),
      );
    });

    it('ignores move requests for players not in the hub', async () => {
      presence.get.mockResolvedValue(null);

      await service.moveTo('ghost', { x: 0, z: 0 }, { x: 1, z: 1 });

      expect(presence.upsert).not.toHaveBeenCalled();
      expect(sse.emit).not.toHaveBeenCalled();
    });
  });

  describe('sendChat', () => {
    it('appends the message and broadcasts CHAT_MESSAGE', async () => {
      presence.get.mockResolvedValue({
        playerId: 'p1', username: 'Alice', skin: 'warrior',
        position: { x: 0, z: 0 }, target: null, updatedAt: baseTime,
      });

      await service.sendChat('p1', 'Alice', 'hello world');

      expect(chat.append).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 'p1', username: 'Alice', text: 'hello world', sentAt: baseTime,
      }));
      expect(sse.emit).toHaveBeenCalledWith(
        HUB_GLOBAL_CHANNEL,
        HUB_EVENTS.CHAT_MESSAGE,
        expect.objectContaining({ message: expect.objectContaining({ text: 'hello world' }) }),
      );
    });

    it('rejects messages from players not in the hub', async () => {
      presence.get.mockResolvedValue(null);

      await expect(service.sendChat('ghost', 'Ghost', 'boo')).rejects.toThrow();
      expect(chat.append).not.toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('removes presence and broadcasts PLAYER_LEAVE', async () => {
      await service.leave('p1');

      expect(presence.remove).toHaveBeenCalledWith('p1');
      expect(sse.emit).toHaveBeenCalledWith(
        HUB_GLOBAL_CHANNEL,
        HUB_EVENTS.PLAYER_LEAVE,
        { playerId: 'p1' },
      );
    });
  });

  describe('heartbeat', () => {
    it('re-upserts the existing snapshot with refreshed updatedAt', async () => {
      const existing: HubPlayerSnapshot = {
        playerId: 'p1', username: 'Alice', skin: 'warrior',
        position: { x: 4, z: 2 }, target: null, updatedAt: baseTime - 5000,
      };
      presence.get.mockResolvedValue(existing);

      await service.heartbeat('p1');

      expect(presence.upsert).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 'p1', position: { x: 4, z: 2 }, updatedAt: baseTime,
      }));
    });

    it('does nothing if the player is not present', async () => {
      presence.get.mockResolvedValue(null);

      await service.heartbeat('ghost');

      expect(presence.upsert).not.toHaveBeenCalled();
    });
  });
});
