import React, { Suspense } from 'react';
import { HUB_POIS, HubPoiDef } from './hubMap';
import { HubPOI } from './HubPOI';

interface HubPOILayerProps {
  mapSize: number;
  activePoi: HubPoiDef | null;
}

export const HubPOILayer = React.memo(({ mapSize, activePoi }: HubPOILayerProps) => {
  return (
    <Suspense fallback={null}>
      {HUB_POIS.map((poi) => (
        <HubPOI
          key={poi.id}
          poi={poi}
          mapSize={mapSize}
          isNear={activePoi?.id === poi.id}
        />
      ))}
    </Suspense>
  );
});
