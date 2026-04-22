import React from 'react';
import { useNavigate } from 'react-router-dom';
import { gameSessionApi } from '../../../api/game-session.api';
import { useGameSession } from '../../../pages/GameTunnel';
import { HubMenuOverlay } from './HubMenuOverlay';

interface VsAiMenuOverlayProps {
  onClose: () => void;
}

export function VsAiMenuOverlay({ onClose }: VsAiMenuOverlayProps) {
  const navigate = useNavigate();
  const { activeSession, refreshSession } = useGameSession();

  const hasOpenSession = !!activeSession;

  const handleStart = async () => {
    try {
      await gameSessionApi.startVsAi();
      await refreshSession({ silent: true });
      navigate('/farming');
    } catch {
      window.alert('Impossible de lancer le combat VS IA.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Réinitialiser votre session ? La progression non sauvegardée sera perdue.')) return;
    try {
      await gameSessionApi.resetSession();
      await refreshSession({ silent: true });
      window.alert('Session réinitialisée.');
    } catch {
      window.alert('Impossible de réinitialiser la session.');
    }
  };

  return (
    <HubMenuOverlay title="🤖 VS IA" onClose={onClose}>
      <div className="hub-vsai-body">
        <p>
          {hasOpenSession
            ? 'Vous avez une partie en cours. Reprenez-la ou réinitialisez pour en commencer une nouvelle.'
            : 'Lancez un combat solo contre l\'IA.'}
        </p>
        <button
          type="button"
          className={`vs-ai-btn ${hasOpenSession ? 'resume' : ''}`}
          onClick={hasOpenSession ? () => navigate('/farming') : handleStart}
        >
          {hasOpenSession ? '▶ Reprendre la partie' : '⚔ Lancer VS IA'}
        </button>
        {hasOpenSession && (
          <button type="button" className="reset-session-link" onClick={handleReset}>
            🔄 Réinitialiser
          </button>
        )}
      </div>
    </HubMenuOverlay>
  );
}
