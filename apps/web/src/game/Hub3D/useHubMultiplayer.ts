import { useEffect } from 'react';

import { useAuthStore } from '../../store/auth.store';
import { useHubStore } from '../../store/hub.store';

const HEARTBEAT_INTERVAL_MS = 10_000;
const LEAVE_URL = '/api/v1/hub/leave';

function sendLeaveBeacon(token: string): void {
  try {
    void fetch(LEAVE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    });
  } catch {
    // pagehide best-effort; the server reaper covers any leak.
  }
}

export function useHubMultiplayer(): void {
  const token = useAuthStore((state) => state.token);
  const playerId = useAuthStore((state) => state.player?.id);
  const connect = useHubStore((state) => state.connect);
  const disconnect = useHubStore((state) => state.disconnect);
  const heartbeat = useHubStore((state) => state.heartbeat);

  useEffect(() => {
    if (!token || !playerId) return;
    void connect();
    const t = window.setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
    const onPageHide = (): void => sendLeaveBeacon(token);
    window.addEventListener('pagehide', onPageHide);
    return (): void => {
      window.clearInterval(t);
      window.removeEventListener('pagehide', onPageHide);
      void disconnect();
    };
  }, [token, playerId, connect, disconnect, heartbeat]);
}
