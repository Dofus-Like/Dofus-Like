import { Canvas } from '@react-three/fiber';
import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import { Component, Suspense, useCallback, useEffect, useRef } from 'react';
import { Vector3, type Group } from 'three';

import { HubAmbientParticles } from './HubAmbientParticles';
import { HubCamera } from './HubCamera';
import { HubGroundProvider, useHubGround } from './HubGround';
import { HubMap } from './HubMap';
import { HubPOI } from './HubPOI';
import { HubPlayer } from './HubPlayer';
import {
  HUB_POIS,
  NAVIGATION_PLANE_SIZE,
  NAVIGATION_PLANE_Y,
  NAVIGATION_RADIUS,
  POI_STOP_DISTANCE,
  SPAWN_POSITION,
  type PoiId,
} from './constants';
import { useClickToMove } from './useClickToMove';
import { useHubInputController } from './useHubInputController';

interface Hub3DSceneProps {
  onPoiActivate: (id: PoiId) => void;
  activePoiId: PoiId | null;
}

interface Hub3DWorldProps {
  onPoiActivate: (id: PoiId) => void;
  activePoiId: PoiId | null;
  wasDraggingRef: MutableRefObject<boolean>;
}

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class HubMapBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    if (typeof console !== 'undefined') {
      console.error('[Hub3D] failed to load hub model', error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function HubLights(): ReactElement {
  return (
    <>
      <ambientLight intensity={1.0} />
      <hemisphereLight args={['#bcd7ff', '#3a2a1a', 0.8]} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  );
}

function NavigationPlane(): ReactElement {
  return (
    <mesh
      name="hub-navigation-plane"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, NAVIGATION_PLANE_Y, 0]}
    >
      <planeGeometry args={[NAVIGATION_PLANE_SIZE, NAVIGATION_PLANE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

function NavigationFallbackFloor(): ReactElement {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[NAVIGATION_RADIUS, 64]} />
      <meshStandardMaterial color="#2b3344" roughness={1} />
    </mesh>
  );
}

function computePoiStopPoint(playerPos: Vector3, poiPos: Vector3, stopDistance: number): Vector3 {
  const dx = poiPos.x - playerPos.x;
  const dz = poiPos.z - playerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= stopDistance) {
    return playerPos.clone();
  }
  const factor = (dist - stopDistance) / dist;
  return new Vector3(playerPos.x + dx * factor, 0, playerPos.z + dz * factor);
}

function PoiList({ modalOpen }: { modalOpen: boolean }): ReactElement {
  return (
    <>
      {Object.values(HUB_POIS).map((poi) => (
        <HubPOI key={poi.id} poi={poi} modalOpen={modalOpen} />
      ))}
    </>
  );
}

function useInitialPlayerSnap(playerRef: React.RefObject<Group | null>, snapY: (x: number, z: number) => number, ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;
    player.position.y = snapY(player.position.x, player.position.z);
  }, [playerRef, ready, snapY]);
}

function HubWorld({ onPoiActivate, activePoiId, wasDraggingRef }: Hub3DWorldProps): ReactElement {
  const modalOpen = activePoiId !== null;
  const playerRef = useRef<Group>(null);
  const { snapY, ready, hubMeshRef } = useHubGround();

  useInitialPlayerSnap(playerRef, snapY, ready);

  const handleArrive = useCallback((metadata: PoiId | null): void => {
    if (!metadata) return;
    onPoiActivate(metadata);
  }, [onPoiActivate]);

  const { setTarget } = useClickToMove<PoiId>({
    playerRef,
    snapY,
    onArrive: handleArrive,
  });

  const handlePoiActivate = useCallback((id: PoiId): void => {
    const poi = Object.values(HUB_POIS).find((entry) => entry.id === id);
    const player = playerRef.current;
    if (!poi || !player) return;
    const playerPos = new Vector3(player.position.x, 0, player.position.z);
    const poiPos = new Vector3(poi.position[0], 0, poi.position[2]);
    setTarget(computePoiStopPoint(playerPos, poiPos, POI_STOP_DISTANCE), id);
  }, [setTarget]);

  const handleGroundClick = useCallback((point: Vector3): void => {
    setTarget(point, null);
  }, [setTarget]);

  useHubInputController({
    enabled: !modalOpen,
    wasDraggingRef,
    hubMeshRef,
    onPoiActivate: handlePoiActivate,
    onGroundClick: handleGroundClick,
  });

  return (
    <>
      <HubLights />
      <HubMapBoundary fallback={<NavigationFallbackFloor />}>
        <Suspense fallback={null}><HubMap /></Suspense>
      </HubMapBoundary>
      <PoiList modalOpen={modalOpen} />
      <NavigationPlane />
      <HubPlayer ref={playerRef} position={SPAWN_POSITION} />
      <HubAmbientParticles />
    </>
  );
}

export function Hub3DScene({ onPoiActivate, activePoiId }: Hub3DSceneProps): ReactElement {
  const wasDraggingRef = useRef(false);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <HubGroundProvider>
        <HubCamera wasDraggingRef={wasDraggingRef} />
        <HubWorld onPoiActivate={onPoiActivate} activePoiId={activePoiId} wasDraggingRef={wasDraggingRef} />
      </HubGroundProvider>
    </Canvas>
  );
}
