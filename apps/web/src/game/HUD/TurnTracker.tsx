import React from 'react';

import type { CombatPlayer } from '@game/shared-types';

import { getSkinById } from '../../game/constants/skins';

import './TurnTracker.css';

interface TurnTrackerProps {
  fighters: CombatPlayer[];
  currentTurnPlayerId: string;
  turnNumber: number;
  selfId: string;
}

const SLOT_COUNT = 5;

interface SlotInfo {
  fighter: CombatPlayer;
  index: number;
  isActive: boolean;
}

function buildSlots(fighters: CombatPlayer[], currentTurnPlayerId: string): SlotInfo[] {
  if (fighters.length === 0) return [];
  const activeIndex = fighters.findIndex((f) => f.playerId === currentTurnPlayerId);
  const start = activeIndex === -1 ? 0 : activeIndex;
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const fighter = fighters[(start + i) % fighters.length];
    return { fighter, index: i, isActive: i === 0 };
  });
}

interface AvatarCircleProps {
  fighter: CombatPlayer;
  isActive: boolean;
  isSelf: boolean;
}

function AvatarCircle({ fighter, isActive, isSelf }: AvatarCircleProps) {
  const skinConfig = getSkinById(fighter.skin ?? 'soldier-classic');
  const classes = [
    'tt-avatar',
    isActive ? 'tt-avatar--active' : '',
    isSelf ? 'tt-avatar--self' : 'tt-avatar--foe',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} title={fighter.username}>
      <div
        className={`tt-avatar-sprite avatar-${skinConfig.type}`}
        style={{ filter: `hue-rotate(${skinConfig.hue}deg) saturate(${skinConfig.saturation})` }}
      />
    </div>
  );
}

export function TurnTracker({ fighters, currentTurnPlayerId, turnNumber, selfId }: TurnTrackerProps) {
  const ordered = React.useMemo(
    () => [...fighters].sort((a, b) => (b.stats?.ini ?? 0) - (a.stats?.ini ?? 0)),
    [fighters],
  );

  const slots = buildSlots(ordered, currentTurnPlayerId);

  return (
    <div className="turn-tracker glass">
      <span className="tt-turn-label">TOUR {turnNumber}</span>
      <div className="tt-slots">
        {slots.map((slot, i) => (
          <React.Fragment key={`${slot.fighter.playerId}-${slot.index}`}>
            <AvatarCircle
              fighter={slot.fighter}
              isActive={slot.isActive}
              isSelf={slot.fighter.playerId === selfId}
            />
            {i < slots.length - 1 && <span className="tt-arrow">›</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
