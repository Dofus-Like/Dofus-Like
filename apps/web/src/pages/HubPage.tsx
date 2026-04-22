import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { Leva } from 'leva';
import { findPath, TerrainType } from '@game/shared-types';
import type { PathNode } from '@game/shared-types';
import { UnifiedMapScene } from '../game/UnifiedMap/UnifiedMapScene';
import { CombatBackgroundShader } from '../game/Combat/CombatBackgroundShader';
import { buildHubMap, HUB_SPAWN } from '../game/Hub/hubMap';
import { useHubProximity } from '../game/Hub/useHubProximity';
import { SkinMenuOverlay } from '../game/Hub/overlays/SkinMenuOverlay';
import { RoomMenuOverlay } from '../game/Hub/overlays/RoomMenuOverlay';
import { VsAiMenuOverlay } from '../game/Hub/overlays/VsAiMenuOverlay';
import { useAuthStore } from '../store/auth.store';
import { useGameSession } from './GameTunnel';
import './HubPage.css';

const hubMap = buildHubMap();

export function HubPage() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const { activeSession, refreshSession } = useGameSession();

  const [playerPosition, setPlayerPosition] = useState<PathNode>(HUB_SPAWN);
  const [movePath, setMovePath] = useState<PathNode[] | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [controls, setControls] = useState<CameraControlsImpl | null>(null);
  const [isCameraMoving, setIsCameraMoving] = useState(false);

  // Overlay dismiss state — resets when player leaves POI range
  const [dismissedPoiId, setDismissedPoiId] = useState<string | null>(null);

  const activePoi = useHubProximity(playerPosition);

  useEffect(() => {
    if (!activePoi) setDismissedPoiId(null);
  }, [activePoi]);

  const showOverlay = activePoi !== null && dismissedPoiId !== activePoi.id;

  const handleCloseOverlay = useCallback(() => {
    if (activePoi) setDismissedPoiId(activePoi.id);
  }, [activePoi]);

  // Auth + redirect guard
  useEffect(() => {
    void initialize();
    void refreshSession({ silent: true });
  }, [initialize, refreshSession]);

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.status === 'ACTIVE') {
      navigate('/farming', { replace: true });
    }
  }, [activeSession, navigate]);

  // Camera controls setup
  useEffect(() => {
    if (!controls) return;

    let tid: number | undefined;

    const start = () => {
      if (tid) window.clearTimeout(tid);
      setIsCameraMoving(true);
    };
    const end = () => {
      if (tid) window.clearTimeout(tid);
      tid = window.setTimeout(() => setIsCameraMoving(false), 250);
    };

    controls.addEventListener('controlstart', start);
    controls.addEventListener('controlend', end);
    controls.addEventListener('rest', () => {
      if (tid) window.clearTimeout(tid);
      setIsCameraMoving(false);
    });
    controls.mouseButtons.left = CameraControlsImpl.ACTION.NONE;
    controls.mouseButtons.right = CameraControlsImpl.ACTION.TRUCK;
    // Target courtyard floor level (Y=0) — castle lifted to Y=1.5 so courtyard ≈ Y=0
    void controls.setLookAt(15, 20, 15, 0, 0, 0, false);

    return () => {
      if (tid) window.clearTimeout(tid);
      controls.removeEventListener('controlstart', start);
      controls.removeEventListener('controlend', end);
    };
  }, [controls]);

  const handleTileClick = useCallback(
    (x: number, y: number, terrain: TerrainType) => {
      if (isCameraMoving) return;
      if (x === playerPosition.x && y === playerPosition.y) return;
      if (!hubMap) return;

      const props = (hubMap.grid[y]?.[x] as TerrainType | undefined);
      if (props === undefined) return;

      const path = findPath(hubMap, playerPosition, { x, y });
      if (!path || path.length === 0) return;

      setMovePath(path);
      setIsMoving(true);
    },
    [isCameraMoving, playerPosition],
  );

  const handleTileReached = useCallback((node: PathNode) => {
    setPlayerPosition(node);
  }, []);

  const handlePathComplete = useCallback(() => {
    if (movePath && movePath.length > 0) {
      setPlayerPosition(movePath[movePath.length - 1]);
    }
    setMovePath(null);
    setIsMoving(false);
  }, [movePath]);

  // Unused terrain param intentional — API requires it
  const handleTileClickWrapper = useCallback(
    (x: number, y: number, terrain: TerrainType) => handleTileClick(x, y, terrain),
    [handleTileClick],
  );

  return (
    <div className="hub-page">
      <Leva hidden />
      <div className="hub-canvas-container">
        <Canvas
          shadows
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <CombatBackgroundShader />
          <OrthographicCamera makeDefault position={[15, 20, 15]} zoom={50} near={0.1} far={100} />
          <CameraControls
            ref={setControls}
            makeDefault
            minZoom={15}
            maxZoom={70}
            dollyToCursor
            infinityDolly={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />
          <ambientLight intensity={0.5} />
          <hemisphereLight args={['#87ceeb', '#2d4a1e', 0.6]} />
          <directionalLight position={[10, 20, 10]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
          <Suspense fallback={null}>
            <UnifiedMapScene
              mode="hub"
              map={hubMap}
              playerPosition={playerPosition}
              movePath={movePath}
              onPathComplete={handlePathComplete}
              onTileClick={handleTileClickWrapper}
              onTileReached={handleTileReached}
              isCameraMoving={isCameraMoving}
              isMoving={isMoving}
              activePoi={activePoi}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* HTML overlay layer — outside Canvas */}
      {showOverlay && activePoi && (
        <div className="hub-overlay-layer">
          {activePoi.id === 'skin' && <SkinMenuOverlay onClose={handleCloseOverlay} />}
          {activePoi.id === 'room' && <RoomMenuOverlay onClose={handleCloseOverlay} />}
          {activePoi.id === 'vsai' && <VsAiMenuOverlay onClose={handleCloseOverlay} />}
        </div>
      )}
    </div>
  );
}
