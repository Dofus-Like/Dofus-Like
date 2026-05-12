export interface HubVector2 {
  x: number;
  z: number;
}

export interface HubPlayerSnapshot {
  playerId: string;
  username: string;
  skin: string;
  position: HubVector2;
  target: HubVector2 | null;
  updatedAt: number;
}

export interface HubChatMessage {
  id: string;
  playerId: string;
  username: string;
  text: string;
  sentAt: number;
}

export interface HubInitialState {
  self: HubPlayerSnapshot;
  players: HubPlayerSnapshot[];
  chatHistory: HubChatMessage[];
}

export interface HubMovePayload {
  playerId: string;
  target: HubVector2;
  position: HubVector2;
  updatedAt: number;
}

export interface HubJoinPayload {
  player: HubPlayerSnapshot;
}

export interface HubLeavePayload {
  playerId: string;
}

export interface HubChatPayload {
  message: HubChatMessage;
}

export const HUB_GLOBAL_CHANNEL = 'hub:global' as const;
export const HUB_CHAT_HISTORY_LIMIT = 100;
export const HUB_PRESENCE_TTL_SECONDS = 30;
