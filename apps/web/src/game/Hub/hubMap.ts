import { GameMap, TerrainType } from '@game/shared-types';

export const HUB_SIZE = 7;
export const HUB_SPAWN = { x: 3, y: 3 };

export interface HubPoiDef {
  id: 'skin' | 'room' | 'vsai';
  label: string;
  icon: string;
  position: { x: number; y: number };
}

// 7x7 grid centered on the castle courtyard. POIs placed at 3 inner corners of the grass.
export const HUB_POIS: HubPoiDef[] = [
  { id: 'skin',  label: 'Apparence',   icon: '🎭', position: { x: 1, y: 1 } },
  { id: 'room',  label: 'Multijoueur', icon: '⚔️', position: { x: 5, y: 1 } },
  { id: 'vsai',  label: 'VS IA',       icon: '🤖', position: { x: 1, y: 5 } },
];

export function buildHubMap(): GameMap {
  const grid = Array.from({ length: HUB_SIZE }, () =>
    Array<TerrainType>(HUB_SIZE).fill(TerrainType.GROUND),
  );
  return { width: HUB_SIZE, height: HUB_SIZE, grid, seedId: 'FORGE' as const };
}
