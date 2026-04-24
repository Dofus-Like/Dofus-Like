import React from 'react';
import { useNavigate } from 'react-router-dom';

import { CombatActionType, SpellFamily } from '@game/shared-types';

import { combatApi } from '../../api/combat.api';
import { SpellBar, type SpellBarItem } from '../../components/SpellBar/SpellBar';
import { useGameSession } from '../../pages/GameTunnel';
import { useAuthStore } from '../../store/auth.store';
import { useCombatStore } from '../../store/combat.store';
import { CombatPlayerPanel } from './CombatPlayerPanel';

import './CombatHUD.css';

const SPELL_FAMILY_ORDER: Record<SpellFamily, number> = {
  [SpellFamily.COMMON]: 1,
  [SpellFamily.WARRIOR]: 2,
  [SpellFamily.MAGE]: 3,
  [SpellFamily.NINJA]: 4,
};

function getCombatErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function CombatHUD() {
  const combatState = useCombatStore((s) => s.combatState);
  const sessionId = useCombatStore((s) => s.sessionId);
  const selectedSpellId = useCombatStore((s) => s.selectedSpellId);
  const setSelectedSpell = useCombatStore((s) => s.setSelectedSpell);
  const setCombatState = useCombatStore((s) => s.setCombatState);
  const winnerId = useCombatStore((s) => s.winnerId);
  const showMannequins = useCombatStore((s) => s.showMannequins);
  const toggleShowMannequins = useCombatStore((s) => s.toggleShowMannequins);
  const disconnect = useCombatStore((s) => s.disconnect);
  const uiMessage = useCombatStore((s) => s.uiMessage);
  const setUiMessage = useCombatStore((s) => s.setUiMessage);
  
  const user = useAuthStore((s) => s.player);
  const navigate = useNavigate();
  const { activeSession } = useGameSession();

  const currentPlayer = (combatState && user) ? combatState.players[user.id] : null;
  const enemyId = combatState && user ? Object.keys(combatState.players).find(id => id !== user.id) : null;
  const isMyTurn = (combatState && user) ? combatState.currentTurnPlayerId === user.id : false;

  React.useEffect(() => {
    if (!uiMessage) return;
    const timer = setTimeout(() => setUiMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [setUiMessage, uiMessage]);

  if (!combatState || !user || !currentPlayer) return null;

  const handleCombatExit = () => {
    disconnect();
    if (activeSession?.status === 'ACTIVE') {
      navigate('/farming', { replace: true });
    } else {
      navigate('/');
    }
  };

  const isWinner = winnerId === user.id;
  const showCombatEnd = !!winnerId;

  const sortedSpells = [...currentPlayer.spells].sort((a, b) => {
    const familyOrder = SPELL_FAMILY_ORDER[a.family] - SPELL_FAMILY_ORDER[b.family];
    if (familyOrder !== 0) return familyOrder;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  const mappedSpellItems: SpellBarItem[] = sortedSpells.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    iconPath: s.iconPath,
    paCost: s.paCost,
    family: s.family,
    sortOrder: s.sortOrder,
    cooldown: currentPlayer.spellCooldowns[s.id],
    damage: s.damage,
    effectKind: s.effectKind,
    minRange: s.minRange,
    maxRange: s.maxRange,
  }));

  const handleEndTurn = async () => {
    if (!sessionId || !isMyTurn) return;
    try {
      const res = await combatApi.playAction(sessionId, { type: CombatActionType.END_TURN });
      if (res?.data) setCombatState(res.data);
      setSelectedSpell(null);
    } catch (err) {
      console.error('CombatHUD: End turn failed', err);
      setUiMessage(getCombatErrorMessage(err, 'Impossible de terminer le tour.'), 'error');
    }
  };

  // Initiative order (highest INI first)
  const orderedFighters = Object.values(combatState.players)
    .slice()
    .sort((a, b) => (b.stats?.ini ?? 0) - (a.stats?.ini ?? 0));

  return (
    <div className="combat-hud">
      {uiMessage && (
        <div className={`combat-toast ${uiMessage.type}`}>
          {uiMessage.text}
        </div>
      )}

      {/* HUD de fin de combat */}
      {showCombatEnd && (
        <div className={`combat-end-overlay ${isWinner ? 'victory' : 'defeat'}`}>
          <div className="end-modal">
            <h1>{isWinner ? '🏆 VICTOIRE' : '💀 DÉFAITE'}</h1>
            <p>{isWinner ? 'Félicitations, vous avez terrassé votre adversaire !' : 'Dommage... Vous ferez mieux la prochaine fois !'}</p>
            <div className="end-modal-actions">
              <button className="exit-button" onClick={handleCombatExit}>
                {activeSession?.status === 'ACTIVE' ? 'Continuer' : 'Retour au Lobby'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP LEFT: Initiative panel */}
      <div className="hud-initiative glass">
        <div className="hud-initiative-title">Tour {combatState.turnNumber}</div>
        {orderedFighters.map((f) => {
          const active = combatState.currentTurnPlayerId === f.playerId;
          const self = f.playerId === user.id;
          return (
            <div
              key={f.playerId}
              className={`hud-initiative-row ${active ? 'active' : ''} ${self ? 'self' : 'foe'}`}
            >
              <div className="hud-initiative-token" />
              <div className="hud-initiative-info">
                <div className="hud-initiative-name">{f.username}</div>
                <div className="hud-initiative-ini">INI {f.stats?.ini ?? '—'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM PLAYER PANELS */}
      <CombatPlayerPanel playerId={user.id} side="left" />
      {enemyId && <CombatPlayerPanel playerId={enemyId} side="right" />}

      {/* BOTTOM CENTER: SPELLS */}
      <div className="hud-bottom-anchor">
        <SpellBar 
          spells={mappedSpellItems}
          selectedSpellId={selectedSpellId}
          onSpellClick={(id) => setSelectedSpell(id)}
          remainingPa={currentPlayer.remainingPa}
          isMyTurn={isMyTurn}
          showMannequins={showMannequins}
          onToggleMannequins={toggleShowMannequins}
          onPassTurn={handleEndTurn}
          attackerStats={currentPlayer.stats}
          targetStats={enemyId ? combatState.players[enemyId]?.stats : undefined}
        />

        {/* Targeting prompt when a spell is selected */}
        {selectedSpellId && (
          <div className="spell-targeting-prompt glass">
            🎯 Cliquez une case pour <strong>{sortedSpells.find(s => s.id === selectedSpellId)?.name}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
