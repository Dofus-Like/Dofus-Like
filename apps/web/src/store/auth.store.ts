import { create } from 'zustand';
import { authApi } from '../api/auth.api';

interface PlayerProfile {
  id: string;
  username: string;
  email: string;
  gold: number;
}

interface AuthState {
  token: string | null;
  player: PlayerProfile | null;
  setToken: (token: string) => void;
  setPlayer: (player: PlayerProfile) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

const DEV_PLAYER: PlayerProfile | null = import.meta.env.DEV
  ? { id: 'dev-player-id', username: 'DevPlayer', email: 'dev@test.com', gold: 500 }
  : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  player: DEV_PLAYER,

  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token });
  },

  setPlayer: (player: PlayerProfile) => {
    set({ player });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, player: null });
  },

  initialize: async () => {
    const { token, player } = get();
    if (token && !player) {
      try {
        const response = await authApi.getMe();
        set({ player: response.data });
      } catch (err) {
        console.error('Failed to initialize auth store', err);
        localStorage.removeItem('token');
        set({ token: null });
      }
    }
  },
}));
