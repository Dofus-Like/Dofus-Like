import React, { useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useCombatStore } from "../../store/combat.store";

import "./CombatPlayerPanel.css";

interface StatsSectionProps {
  atk: number;
  def: number;
  mag: number;
  res: number;
  ini: number;
}

function StatsSection({ atk, def, mag, res, ini }: StatsSectionProps) {
  return (
    <div className="cpp-stats-grid">
      <div className="cpp-stat stat-atk">
        <span className="cpp-stat-label">ATK</span>
        <strong>{atk}</strong>
      </div>
      <div className="cpp-stat stat-def">
        <span className="cpp-stat-label">DEF</span>
        <strong>{def}</strong>
      </div>
      <div className="cpp-stat stat-mag">
        <span className="cpp-stat-label">MAG</span>
        <strong>{mag}</strong>
      </div>
      <div className="cpp-stat stat-res">
        <span className="cpp-stat-label">RES</span>
        <strong>{res}</strong>
      </div>
      <div className="cpp-stat stat-ini">
        <span className="cpp-stat-label">INI</span>
        <strong>{ini}</strong>
      </div>
    </div>
  );
}

interface CombatPlayerPanelProps {
  playerId: string;
  side: "left" | "right";
  showStats?: boolean;
}

export function CombatPlayerPanel({ playerId, side, showStats }: CombatPlayerPanelProps) {
  const combatState = useCombatStore((s) => s.combatState);
  const user = useAuthStore((s) => s.player);

  const player = combatState?.players[playerId];
  if (!player) return null;

  const isMe = user?.id === playerId;
  const isMyTurn = combatState?.currentTurnPlayerId === playerId;
  const maxHp = player.stats?.vit || 1;
  const hpPercent = Math.max(
    0,
    Math.min(100, (player.currentVit / maxHp) * 100),
  );

  return (
    <div
      className={`blocky-avatar-panel side-${side} ${isMyTurn ? "is-turn" : ""} ${isMe ? "is-me" : "is-enemy"}`}
    >
      <div className="bap-content-row">
        <div className="bap-frame">
          <div 
            className="bap-portrait" 
            style={{ backgroundImage: 'url("/avatar_gobelin.png")' }} 
          >
            <div className="bap-pseudo">{player.username}</div>
            <div className="bap-resources">
              <span className="bap-res-pa">◆{player.remainingPa} PA</span>
              <span className="bap-res-pm">◆{player.remainingPm} PM</span>
            </div>
          </div>
          <div className="bap-hp-bar">
            <div
              className="bap-hp-fill"
              style={{ width: `${hpPercent}%` }}
            />
            <div className="bap-hp-text">
              {player.currentVit}/{maxHp}
            </div>
          </div>
        </div>

        {showStats && (
          <StatsSection
            atk={player.stats.atk}
            def={player.stats.def}
            mag={player.stats.mag}
            res={player.stats.res}
            ini={player.stats.ini}
          />
        )}
      </div>
    </div>
  );
}
