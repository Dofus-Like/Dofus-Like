import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCombatStore } from '../../store/combat.store';
import { useAuthStore } from '../../store/auth.store';
import { combatApi } from '../../api/combat.api';
import { CombatActionType } from '@game/shared-types';
import './CombatHUD.css';

const SPELL_FAMILIES: Record<string, 'warrior' | 'mage' | 'ninja'> = {
  'spell-frappe': 'warrior',
  'spell-bond': 'warrior',
  'spell-endurance': 'warrior',
  'spell-boule-de-feu': 'mage',
  'spell-menhir': 'mage',
  'spell-soin': 'mage',
  'spell-kunai': 'ninja',
  'spell-bombe-repousse': 'ninja',
  'spell-velocite': 'ninja'
};

const SPELL_ICONS: Record<string, string> = {
  'spell-frappe': '/assets/pack/spells/epee.png',
  'spell-bond': '/assets/pack/spells/bond.png',
  'spell-endurance': '/assets/pack/spells/endurance.png',
  'spell-boule-de-feu': '/assets/pack/spells/fireball.png',
  'spell-menhir': '/assets/pack/spells/menhir.png',
  'spell-soin': '/assets/pack/spells/heal.png',
  'spell-kunai': '/assets/pack/spells/kunai.png',
  'spell-bombe-repousse': '/assets/pack/spells/bombe.png',
  'spell-velocite': '/assets/pack/spells/velocite.png'
};

export function CombatHUD() {
  const combatState = useCombatStore((s) => s.combatState);
  const sessionId = useCombatStore((s) => s.sessionId);
  const selectedSpellId = useCombatStore((s) => s.selectedSpellId);
  const setSelectedSpell = useCombatStore((s) => s.setSelectedSpell);
  const setCombatState = useCombatStore((s) => s.setCombatState);
  const winnerId = useCombatStore((s) => s.winnerId);
  const surrender = useCombatStore((s) => s.surrender);
  const disconnect = useCombatStore((s) => s.disconnect);
  
  const user = useAuthStore((s) => s.player);
  const navigate = useNavigate();

  const currentPlayer = (combatState && user) ? combatState.players[user.id] : null;
  const isMyTurn = (combatState && user) ? combatState.currentTurnPlayerId === user.id : false;

  if (!combatState || !user || !currentPlayer) return null;

  const handleCombatExit = () => {
    disconnect();
    navigate('/');
  };

  const isWinner = winnerId === user.id;
  const showCombatEnd = !!winnerId;

  // Tri par famille
  const sortedSpells = [...currentPlayer.spells].sort((a, b) => {
    const families: Record<string, number> = { warrior: 1, mage: 2, ninja: 3 };
    const famA = families[SPELL_FAMILIES[a.id]] || 99;
    const famB = families[SPELL_FAMILIES[b.id]] || 99;
    return famA - famB;
  });

  const handleEndTurn = async () => {
    if (!sessionId) return;
    try {
      if (isMyTurn) {
        const res = await combatApi.playAction(sessionId, { type: CombatActionType.END_TURN });
        if (res?.data) setCombatState(res.data);
      } else {
        const res = await combatApi.forcePlayAction(sessionId, combatState.currentTurnPlayerId, { 
          type: CombatActionType.END_TURN 
        });
        if (res?.data) setCombatState(res.data);
      }
      setSelectedSpell(null);
    } catch (err: any) {
      console.error('CombatHUD: End turn failed', err);
    }
  };

  const hpPercent = (currentPlayer.currentVit / currentPlayer.stats.vit) * 100;

  // Calcul des gemmes PA / PM
  const renderGems = (current: number, max: number, type: 'pa' | 'pm') => {
    return Array.from({ length: max }).map((_, i) => (
      <div key={i} className={`gem ${i < current ? 'active' : ''} ${type}`} />
    ));
  };

  const name = (user.username || '').toLowerCase();
  const avatarClass = (name.includes('mage') || name.includes('orc')) ? 'orc' : 'soldier';

  return (
    <div className="combat-hud">
      {/* Overlay de fin de combat */}
      {showCombatEnd && (
        <div className={`combat-end-overlay ${isWinner ? 'victory' : 'defeat'}`}>
          <div className="end-modal">
            <h1>{isWinner ? '🏆 VICTOIRE' : '💀 DÉFAITE'}</h1>
            <p>{isWinner ? 'Félicitations, vous avez terrassé votre adversaire !' : 'Dommage... Vous ferez mieux la prochaine fois !'}</p>
            <div className="end-modal-actions">
                <button className="exit-button" onClick={handleCombatExit}>
                    Retour au Lobby
                </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP LEFT: PORTRAIT, HP, PA/PM */}
      <div className="hud-character-block">
        <div className="hud-portrait-container">
          <div className={`portrait-circle avatar-${avatarClass}`}></div>
          <div className="stats-info">
            <span className="username">{user.username}</span>
            <div className="hp-bar-container">
              <div className="hp-bar-fill" style={{ width: `${Math.max(0, hpPercent)}%` }} />
            </div>
            
            <div className="hud-combined-stats">
                <span className="hp-text">{currentPlayer.currentVit} / {currentPlayer.stats.vit} PV</span>
                <div className="mini-res-row">
                    <span className="res-pa">⚡ {currentPlayer.remainingPa}</span>
                    <span className="res-pm">🦶 {currentPlayer.remainingPm}</span>
                </div>
            </div>
          </div>
        </div>
        <div className="actions-row">
            <button className="surrender-button" onClick={() => surrender()} title="Abandonner">
                🏳️ Abandonner
            </button>
        </div>
      </div>

      {/* BOTTOM CENTER: SPELLS & GEMS */}
      <div className="hud-bottom-anchor">
          {selectedSpellId && (
              <div className="spell-info-overlay">
                  {(() => {
                      const spell = currentPlayer.spells.find(s => s.id === selectedSpellId);
                      if (!spell) return null;
                      return (
                          <>
                            <span className="spell-name-title">{spell.name}</span>
                            <span className="spell-details">Dégâts: {spell.damage.min}-{spell.damage.max} • Portée: {spell.minRange}-{spell.maxRange}</span>
                          </>
                      );
                  })()}
              </div>
          )}

          <div className="spell-bar">
            {sortedSpells.map((spell) => {
              const onCooldown = (currentPlayer.spellCooldowns[spell.id] ?? 0) > 0;
              const notEnoughPa = currentPlayer.remainingPa < spell.paCost;
              const isActive = selectedSpellId === spell.id;
              const disabled = !isMyTurn || onCooldown || notEnoughPa;
              const family = SPELL_FAMILIES[spell.id] || 'warrior';

              return (
                <div 
                  key={spell.id}
                  className={`spell-card ${disabled ? 'disabled' : ''} ${isActive ? 'active' : ''} family-${family}`}
                  onClick={() => !disabled && setSelectedSpell(isActive ? null : spell.id)}
                >
                  <div className="spell-pa-cost">{spell.paCost}</div>
                  <img 
                    src={SPELL_ICONS[spell.id] || ''} 
                    className="spell-icon-img" 
                    alt={spell.name} 
                  />
                  {onCooldown && <div className="spell-cooldown-timer">{currentPlayer.spellCooldowns[spell.id]}</div>}
                </div>
              );
            })}
          </div>
      </div>

      {/* TOP RIGHT: END TURN */}
      <div className="hud-end-turn-anchor">
        <button 
          className={`btn-end-turn-hex ${isMyTurn ? 'my-turn' : ''}`}
          onClick={handleEndTurn}
        >
          {isMyTurn ? 'FIN DE TOUR' : 'ATTENTE...'}
        </button>
      </div>
    </div>
  );
}
