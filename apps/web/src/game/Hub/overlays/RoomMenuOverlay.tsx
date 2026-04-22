import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameSessionApi } from '../../../api/game-session.api';
import { useAuthStore } from '../../../store/auth.store';
import { useGameSession } from '../../../pages/GameTunnel';
import { HubMenuOverlay } from './HubMenuOverlay';

interface Room {
  id: string;
  player1Id: string;
  player2Id: string | null;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  createdAt: string;
  p1: { username: string };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
    );
  }
  return fallback;
}

interface RoomMenuOverlayProps {
  onClose: () => void;
}

export function RoomMenuOverlay({ onClose }: RoomMenuOverlayProps) {
  const navigate = useNavigate();
  const player = useAuthStore((s) => s.player);
  const { activeSession, refreshSession } = useGameSession();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [isInQueue, setIsInQueue] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const [roomsRes, queueRes] = await Promise.all([
        gameSessionApi.getWaitingSessions(),
        gameSessionApi.getQueueStatus(),
      ]);
      setRooms(roomsRes.data);
      setIsInQueue(Boolean(queueRes.data?.queued) && !activeSession);
    } catch {
      // silent
    } finally {
      setLoadingRooms(false);
    }
  }, [activeSession]);

  useEffect(() => {
    void fetchState();
    const id = window.setInterval(() => void fetchState(), 4000);
    return () => window.clearInterval(id);
  }, [fetchState]);

  // Redirect once matched
  useEffect(() => {
    if (isInQueue && activeSession?.status === 'ACTIVE') {
      setIsInQueue(false);
      void refreshSession({ silent: true });
      navigate('/farming');
    }
  }, [activeSession, isInQueue, navigate, refreshSession]);

  const handleCreateRoom = async () => {
    try {
      await gameSessionApi.createPrivateSession();
      await refreshSession({ silent: true });
      await fetchState();
    } catch (error) {
      window.alert(getErrorMessage(error, 'Impossible de créer la room.'));
    }
  };

  const handleCancelRoom = async () => {
    if (!activeSession) return;
    try {
      await gameSessionApi.endSession(activeSession.id);
      await refreshSession({ silent: true });
      await fetchState();
    } catch (error) {
      window.alert(getErrorMessage(error, 'Impossible d\'annuler la room.'));
    }
  };

  const handleJoinRoom = async (sessionId: string) => {
    try {
      await gameSessionApi.joinPrivateSession(sessionId);
      await refreshSession({ silent: true });
      navigate('/farming');
    } catch (error) {
      window.alert(getErrorMessage(error, 'Impossible de rejoindre la room.'));
    }
  };

  const handleJoinQueue = async () => {
    try {
      const response = await gameSessionApi.joinQueue();
      if (response.data?.status === 'matched') {
        await refreshSession({ silent: true });
        navigate('/farming');
        return;
      }
      setIsInQueue(true);
    } catch (error) {
      window.alert(getErrorMessage(error, 'Impossible de rejoindre la file.'));
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await gameSessionApi.leaveQueue();
      setIsInQueue(false);
    } catch (error) {
      window.alert(getErrorMessage(error, 'Impossible de quitter la file.'));
    }
  };

  const hasOpenSession = !!activeSession;
  const isWaitingPrivate =
    activeSession?.status === 'WAITING' &&
    activeSession.player1Id === player?.id &&
    activeSession.player2Id == null;

  const visibleRooms = rooms.filter((r) => r.status === 'WAITING' && r.player2Id == null);

  return (
    <HubMenuOverlay title="⚔️ Multijoueur" onClose={onClose}>
      {/* Match aléatoire */}
      <div className="hub-room-section">
        <h3>Match aléatoire</h3>
        <div className="matchmaking-card">
          <div className="matchmaking-info">
            <p>Affrontez un adversaire dans le tunnel de jeu.</p>
          </div>
          {isInQueue ? (
            <div className="queue-status">
              <div className="loader-dots">
                <span /><span /><span />
              </div>
              <span>Recherche d&apos;un adversaire...</span>
              <button type="button" className="leave-queue-btn" onClick={handleLeaveQueue}>
                Annuler
              </button>
            </div>
          ) : isWaitingPrivate ? (
            <div className="queue-status">
              <span>Votre room privée est en attente.</span>
              <button type="button" className="leave-queue-btn" onClick={handleCancelRoom}>
                Annuler la room
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="join-queue-btn"
              onClick={handleJoinQueue}
              disabled={hasOpenSession}
            >
              Lancer une recherche
            </button>
          )}
        </div>
      </div>

      {/* Rooms privées */}
      <div className="hub-room-section">
        <h3>Rooms personnalisées</h3>
        <div className="hub-room-actions" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="lobby-btn action"
            onClick={isWaitingPrivate ? handleCancelRoom : handleCreateRoom}
            disabled={isInQueue || (hasOpenSession && !isWaitingPrivate)}
          >
            {isWaitingPrivate ? 'Annuler la room' : 'Créer une room'}
          </button>
        </div>
        <div className="hub-rooms-list">
          {loadingRooms ? (
            <div className="no-rooms">Chargement...</div>
          ) : visibleRooms.length === 0 ? (
            <div className="no-rooms">Aucune room ouverte.</div>
          ) : (
            visibleRooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-info">
                  <span className="room-host">{room.p1.username}</span>
                  <span className="room-date">{new Date(room.createdAt).toLocaleTimeString()}</span>
                </div>
                <button
                  type="button"
                  className="room-join-btn"
                  onClick={() => void handleJoinRoom(room.id)}
                  disabled={room.player1Id === player?.id || hasOpenSession || isInQueue}
                >
                  {room.player1Id === player?.id ? 'Votre room' : 'Rejoindre'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </HubMenuOverlay>
  );
}
