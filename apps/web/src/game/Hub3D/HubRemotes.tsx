import { useMemo, type ReactElement } from 'react';
import type { HubChatMessage } from '@game/shared-types';

import { useHubStore } from '../../store/hub.store';

import { HubRemotePlayer } from './HubRemotePlayer';

const BUBBLE_TTL_MS = 4000;

function buildLatestMessages(chat: HubChatMessage[], now: number): Map<string, HubChatMessage> {
  const result = new Map<string, HubChatMessage>();
  for (const msg of chat) {
    if (now - msg.sentAt > BUBBLE_TTL_MS) continue;
    result.set(msg.playerId, msg);
  }
  return result;
}

export function HubRemotes(): ReactElement {
  const players = useHubStore((state) => state.players);
  const selfId = useHubStore((state) => state.selfId);
  const chat = useHubStore((state) => state.chat);

  const latestByPlayer = useMemo(() => buildLatestMessages(chat, Date.now()), [chat]);
  const others = useMemo(
    () => Object.values(players).filter((snap) => snap.playerId !== selfId),
    [players, selfId],
  );

  return (
    <>
      {others.map((snap) => (
        <HubRemotePlayer
          key={snap.playerId}
          snapshot={snap}
          lastMessage={latestByPlayer.get(snap.playerId)}
        />
      ))}
    </>
  );
}
