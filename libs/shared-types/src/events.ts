export const GAME_EVENTS = {
  // Émis par Équipe A, consommés par Équipe B
  ITEM_EQUIPPED: 'player.item.equipped',
  ITEM_UNEQUIPPED: 'player.item.unequipped',
  SPELL_LEARNED: 'player.spell.learned',
  SPELLS_CHANGED: 'player.spells.changed',
  SESSION_CREATED: 'game.session.created',
  // Émis par Équipe B, consommés par Équipe A
  COMBAT_ENDED: 'combat.ended',
  COMBAT_PLAYER_DIED: 'combat.player.died',
  TURN_STARTED: 'combat.turn.started',
} as const;

export type GameEventKey = keyof typeof GAME_EVENTS;
export type GameEventValue = (typeof GAME_EVENTS)[GameEventKey];

export const HUB_EVENTS = {
  INIT: 'hub.init',
  PLAYER_JOIN: 'hub.player.join',
  PLAYER_LEAVE: 'hub.player.leave',
  PLAYER_MOVE: 'hub.player.move',
  CHAT_MESSAGE: 'hub.chat.message',
} as const;

export type HubEventKey = keyof typeof HUB_EVENTS;
export type HubEventValue = (typeof HUB_EVENTS)[HubEventKey];
