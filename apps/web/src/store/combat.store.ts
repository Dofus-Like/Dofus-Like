import { create } from 'zustand';
import { CombatState, CombatAction, CombatActionType } from '@game/shared-types';
import { combatApi } from '../api/combat.api';
import { useAuthStore } from './auth.store';

interface CombatLog {
  id: string;
  message: string;
  type: 'damage' | 'info' | 'victory';
}

interface CombatStore {
  combatState: CombatState | null;
  sessionId: string | null;
  sseConnection: EventSource | null;
  selectedSpellId: string | null;
  isSelectingTarget: boolean;
  logs: CombatLog[];
  lastSpellCast: { casterId: string; spellId: string; visualType: string; targetX: number; targetY: number; timestamp: number } | null;
  winnerId: string | null;
  
  setCombatState: (state: CombatState) => void;
  setSelectedSpell: (spellId: string | null) => void;
  connectToSession: (sessionId: string) => Promise<void>;
  disconnect: () => void;
  addLog: (message: string, type: CombatLog['type']) => void;
  surrender: () => Promise<void>;
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  combatState: null,
  sessionId: null,
  sseConnection: null,
  selectedSpellId: null,
  isSelectingTarget: false,
  logs: [],
  lastSpellCast: null,
  winnerId: null,

  setCombatState: (state: CombatState) => {
    console.log('CombatStore: Updating state', state);
    set({ combatState: { ...state }, winnerId: state.winnerId || null });
  },

  setSelectedSpell: (spellId: string | null) => {
    set({ selectedSpellId: spellId, isSelectingTarget: !!spellId });
  },

  addLog: (message: string, type: CombatLog['type']) => {
    const newLog = { id: Math.random().toString(36).substr(2, 9), message, type };
    set((state) => ({ logs: [newLog, ...state.logs].slice(0, 50) }));
  },

  connectToSession: async (sessionId: string) => {
    const existing = get().sseConnection;
    if (existing) {
      existing.close();
    }

    try {
        const response = await combatApi.getState(sessionId);
        set({ combatState: response.data, logs: [] });
        get().addLog('Combat initialisé', 'info');
    } catch (err) {
        console.error('Failed to fetch initial state', err);
    }

    const token = useAuthStore.getState().token;
    const sseUrl = `${window.location.origin}/api/v1/combat/session/${sessionId}/events?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('STATE_UPDATED', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('State received via SSE:', data);
        set({ combatState: data });
    });

    eventSource.addEventListener('SPELL_CAST', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('Spell cast received:', data);
        set({ lastSpellCast: { ...data, timestamp: Date.now() } });
    });

    eventSource.addEventListener('TURN_STARTED', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        const player = get().combatState?.players[data.playerId];
        const name = player ? (data.playerId === get().combatState?.players[get().combatState?.sessionId || '']?.playerId ? 'Vous' : 'Adversaire') : data.playerId;
        // Simple logic for test:
        const displayName = data.playerId === get().combatState?.players[Object.keys(get().combatState?.players || {})[0]]?.playerId ? 'Warrior' : 'Mage';
        get().addLog(`Début du tour de ${displayName}`, 'info');
    });

    eventSource.addEventListener('DAMAGE_DEALT', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        const displayName = data.targetId === get().combatState?.players[Object.keys(get().combatState?.players || {})[0]]?.playerId ? 'Warrior' : 'Mage';
        get().addLog(`🎯 -${data.damage} PV sur ${displayName}`, 'damage');
    });

    eventSource.addEventListener('COMBAT_ENDED', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        const player = get().combatState?.players[data.winnerId];
        const isMe = data.winnerId === useAuthStore.getState().player?.id;
        const displayName = player?.username || (isMe ? 'Vous' : 'Adversaire');
        
        get().addLog(`🏁 Combat fini ! Vainqueur: ${displayName}`, 'victory');
        set({ winnerId: data.winnerId });
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection error', err);
    };

    set({ sessionId, sseConnection: eventSource });
  },

  disconnect: () => {
    const connection = get().sseConnection;
    if (connection) {
      connection.close();
    }
    set({ combatState: null, sessionId: null, sseConnection: null, selectedSpellId: null, isSelectingTarget: false, logs: [], winnerId: null });
  },

  surrender: async () => {
    const { sessionId, combatState } = get();
    if (!sessionId || !combatState) return;

    if (window.confirm('Voulez-vous vraiment abandonner ?')) {
        await combatApi.playAction(sessionId, { type: 'SURRENDER' as any });
    }
  },
}));
