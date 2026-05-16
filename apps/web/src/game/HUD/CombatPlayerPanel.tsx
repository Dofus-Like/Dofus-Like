import React from "react";

import type { SpellDefinition } from "@game/shared-types";
import { SpellFamily } from "@game/shared-types";

import { getSkinById } from "../../game/constants/skins";
import { useAuthStore } from "../../store/auth.store";
import { useCombatStore } from "../../store/combat.store";

import "./CombatPlayerPanel.css";

interface CombatPlayerPanelProps {
  playerId: string;
  side: "left" | "right";
}

const FAMILY_LABEL: Record<SpellFamily, string> = {
  [SpellFamily.COMMON]: "INITIÉ",
  [SpellFamily.WARRIOR]: "GUERRIER",
  [SpellFamily.MAGE]: "ARCANE",
  [SpellFamily.NINJA]: "OMBRE",
};

function getDominantFamily(spells: SpellDefinition[]): SpellFamily {
  const counts: Partial<Record<SpellFamily, number>> = {};
  for (const s of spells) {
    if (s.family === SpellFamily.COMMON) continue;
    counts[s.family] = (counts[s.family] ?? 0) + 1;
  }
  let best: SpellFamily = SpellFamily.COMMON;
  let max = 0;
  for (const [family, count] of Object.entries(counts)) {
    if ((count as number) > max) {
      max = count as number;
      best = family as SpellFamily;
    }
  }
  return best;
}

function getHpColor(hpPercent: number): string {
  if (hpPercent > 50) return "hp-green";
  if (hpPercent > 25) return "hp-orange";
  return "hp-red";
}

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

export function CombatPlayerPanel({ playerId, side }: CombatPlayerPanelProps) {
  const combatState = useCombatStore((s) => s.combatState);
  const user = useAuthStore((s) => s.player);
  const [statsOpen, setStatsOpen] = React.useState(false);

  const player = combatState?.players[playerId];
  if (!player) return null;

  const isMe = user?.id === playerId;
  const isMyTurn = combatState?.currentTurnPlayerId === playerId;
  const maxHp = player.stats?.vit || 1;
  const hpPercent = Math.max(
    0,
    Math.min(100, (player.currentVit / maxHp) * 100),
  );
  const hpColorClass = getHpColor(hpPercent);
  const skinConfig = getSkinById(player.skin ?? "soldier-classic");
  const avatarClass = skinConfig.type;
  const family = getDominantFamily(player.spells ?? []);
  const familyLabel = FAMILY_LABEL[family];

  return (
    <div
      className={`combat-player-panel glass side-${side} ${isMyTurn ? "is-turn" : ""} ${isMe ? "is-me" : "is-enemy"}`}
    >
      {/* Header: portrait + name/archetype */}
      <div className="cpp-header-row">
        <div className={`cpp-portrait ${isMyTurn ? "pulse" : ""}`}>
          <div
            className={`portrait-image avatar-${avatarClass}`}
            style={{
              filter: `hue-rotate(${skinConfig.hue}deg) saturate(${skinConfig.saturation})`,
            }}
          />
        </div>
        <div className="cpp-identity">
          <div className="cpp-name">{player.username}</div>
          <span className={`cpp-archetype family-${family.toLowerCase()}`}>
            {familyLabel}
          </span>
        </div>
      </div>

      {/* HP bar + value */}
      <div className="cpp-hp-section">
        <div className="cpp-hp-bar-wrap">
          <div className="cpp-hp-bar">
            <div
              className={`cpp-hp-fill ${hpColorClass}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="cpp-hp-value">
            {player.currentVit}/{maxHp}
          </span>
        </div>
      </div>

      {/* PA / PM resource row */}
      <div className="cpp-resources">
        <span className="cpp-res res-pa">◆{player.remainingPa} PA</span>
        <span className="cpp-res res-pm">◆{player.remainingPm} PM</span>
      </div>

      {/* Collapsible stats */}
      <div className="cpp-stats-toggle">
        <button
          type="button"
          className={`cpp-toggle-btn ${statsOpen ? "open" : ""}`}
          onClick={() => setStatsOpen((v) => !v)}
        >
          {statsOpen ? "▲" : "▼"} Stats
        </button>
      </div>

      {statsOpen && (
        <StatsSection
          atk={player.stats.atk}
          def={player.stats.def}
          mag={player.stats.mag}
          res={player.stats.res}
          ini={player.stats.ini}
        />
      )}
    </div>
  );
}
