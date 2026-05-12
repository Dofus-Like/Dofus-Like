import type { HubChatMessage, HubInitialState, HubVector2 } from '@game/shared-types';

import { apiClient } from './client';

interface MovePayload {
  position: HubVector2;
  target: HubVector2;
}

export const hubApi = {
  join: () => apiClient.post<HubInitialState>('/hub/join'),
  heartbeat: () => apiClient.post<{ ok: true }>('/hub/heartbeat'),
  move: (payload: MovePayload) => apiClient.post<{ ok: true }>('/hub/move', payload),
  chat: (text: string) => apiClient.post<HubChatMessage>('/hub/chat', { text }),
  leave: () => apiClient.post<{ ok: true }>('/hub/leave'),
  getStreamTicket: () =>
    apiClient.post<{ ticket: string; expiresIn: number }>('/hub/stream-ticket'),
};
