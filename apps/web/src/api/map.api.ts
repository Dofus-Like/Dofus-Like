import { apiClient } from './client';
import { GameMap } from '@game/shared-types';

export const mapApi = {
  getMap: () => apiClient.get<GameMap>('/map').then((res) => res.data),
  generateNew: () => apiClient.post<GameMap>('/map/reset').then((res) => res.data),
};
