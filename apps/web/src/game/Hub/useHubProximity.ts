import { useMemo } from 'react';
import { PathNode } from '@game/shared-types';
import { HUB_POIS, HubPoiDef } from './hubMap';

export function useHubProximity(playerPosition: PathNode): HubPoiDef | null {
  return useMemo(() => {
    for (const poi of HUB_POIS) {
      const dist =
        Math.abs(playerPosition.x - poi.position.x) +
        Math.abs(playerPosition.y - poi.position.y);
      if (dist <= 1) return poi;
    }
    return null;
  }, [playerPosition]);
}
