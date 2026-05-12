import type { ReactElement, Ref } from 'react';
import type { Group } from 'three';

import { useAuthStore } from '../../store/auth.store';

import { HubPawn } from './HubPawn';

interface HubPlayerProps {
  ref?: Ref<Group>;
  position?: readonly [number, number, number];
}

export function HubPlayer({ ref, position }: HubPlayerProps): ReactElement {
  const skinId = useAuthStore((state) => state.player?.skin);
  return (
    <group ref={ref} position={position as [number, number, number] | undefined}>
      <HubPawn skinId={skinId} />
    </group>
  );
}
