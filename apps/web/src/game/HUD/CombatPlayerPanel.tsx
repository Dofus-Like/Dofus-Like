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
  items?: Array<{ id: string; name: string; rank: number; iconPath?: string; category?: string }>;
}

function StatsSection({ atk, def, mag, res, ini, items = [] }: StatsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const weapons = items.filter((i) => i.category === "weapon");
  const armors = items.filter((i) => i.category === "armor");
  const accessories = items.filter((i) => i.category === "accessory");

  const renderDetailedItem = (item: any) => (
    <div key={item.id} className="cpp-detailed-item">
      <div className={`cpp-di-icon rank-${item.rank}`}>
        {item.iconPath ? (
          <img src={item.iconPath} alt={item.name} />
        ) : (
          <span>{item.name.charAt(0)}</span>
        )}
      </div>
      <div className="cpp-di-info">
        <div className="cpp-di-name">{item.name}</div>
        <div className="cpp-di-rank">Rang {item.rank}</div>
      </div>
    </div>
  );

  return (
    <div className="cpp-stats-container">
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

      <div className="cpp-equipment-section">
        <button 
          className="cpp-eq-toggle-btn" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "▲ Masquer équipement" : "▼ Détails équipement"}
        </button>

        {isExpanded ? (
          <div className="cpp-eq-expanded">
            {weapons.length > 0 && (
              <div className="cpp-eq-cat">
                <div className="cpp-eq-cat-title">Armes</div>
                <div className="cpp-eq-cat-list">{weapons.map(renderDetailedItem)}</div>
              </div>
            )}
            {armors.length > 0 && (
              <div className="cpp-eq-cat">
                <div className="cpp-eq-cat-title">Armure</div>
                <div className="cpp-eq-cat-list">{armors.map(renderDetailedItem)}</div>
              </div>
            )}
            {accessories.length > 0 && (
              <div className="cpp-eq-cat">
                <div className="cpp-eq-cat-title">Accessoires</div>
                <div className="cpp-eq-cat-list">{accessories.map(renderDetailedItem)}</div>
              </div>
            )}
            {items.length === 0 && <div className="cpp-eq-empty">Aucun équipement</div>}
          </div>
        ) : (
          <div className="cpp-items-slots">
            {Array.from({ length: 6 }).map((_, i) => {
              const item = items[i];
              if (item) {
                return (
                  <div key={item.id} className="cpp-item-slot" title={`${item.name} (★${item.rank})`}>
                    {item.iconPath ? (
                      <img src={item.iconPath} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span className="cpp-item-initial">{item.name.charAt(0)}</span>
                    )}
                    <div className={`cpp-item-rank-indicator rank-${item.rank}`} />
                  </div>
                );
              }
              return <div key={`empty-${i}`} className="cpp-item-slot empty" />;
            })}
          </div>
        )}
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
        <div className="bap-frame-wrapper">
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
          
          {player.buffs && player.buffs.length > 0 && (
            <div className="bap-status-list">
              {player.buffs.map((buff, i) => (
                <div key={i} className={`bap-status-icon type-${buff.type.toLowerCase()}`} title={`${buff.type} (${buff.remainingTurns} tr)`}>
                  {buff.type.charAt(0)}
                </div>
              ))}
            </div>
          )}
        </div>

        {showStats && (
          <StatsSection
            atk={player.stats.atk}
            def={player.stats.def}
            mag={player.stats.mag}
            res={player.stats.res}
            ini={player.stats.ini}
            items={player.items}
          />
        )}
      </div>
    </div>
  );
}
