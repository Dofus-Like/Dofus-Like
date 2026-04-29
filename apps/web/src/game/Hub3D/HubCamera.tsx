import { OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject, type ReactElement } from 'react';
import type { OrthographicCamera as OrthographicCameraImpl } from 'three';

import { useHubGround } from './HubGround';
import {
  CAMERA_DRAG_THRESHOLD_PX,
  CAMERA_IDLE_AZIMUTH_AMP,
  CAMERA_IDLE_DELAY_S,
  CAMERA_IDLE_ELEVATION_AMP,
  CAMERA_IDLE_FREQ_AZ,
  CAMERA_IDLE_FREQ_EL,
  CAMERA_LERP_RATE,
  CAMERA_ORBIT_INITIAL_AZIMUTH,
  CAMERA_ORBIT_INITIAL_ELEVATION,
  CAMERA_ORBIT_MAX_ELEVATION,
  CAMERA_ORBIT_MIN_ELEVATION,
  CAMERA_ORBIT_RADIUS,
  CAMERA_ROTATE_SENSITIVITY,
  CAMERA_ZOOM,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_SENSITIVITY,
} from './constants';

interface HubCameraProps {
  wasDraggingRef: MutableRefObject<boolean>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface PivotXYZ { x: number; y: number; z: number; }
interface CameraOrbitState { pivot: PivotXYZ; azimuth: number; elevation: number; zoom: number; }

function applySphericalToCamera(camera: OrthographicCameraImpl, state: CameraOrbitState): void {
  const { pivot, azimuth, elevation, zoom } = state;
  const horizontal = Math.cos(elevation) * CAMERA_ORBIT_RADIUS;
  camera.position.x = pivot.x + Math.sin(azimuth) * horizontal;
  camera.position.z = pivot.z + Math.cos(azimuth) * horizontal;
  camera.position.y = pivot.y + Math.sin(elevation) * CAMERA_ORBIT_RADIUS;
  camera.zoom = zoom;
  camera.lookAt(pivot.x, pivot.y, pivot.z);
  camera.updateProjectionMatrix();
}

function lerpAngle(current: number, target: number, t: number): number {
  return current + (target - current) * Math.min(1, t);
}

interface OrbitListenersConfig {
  azimuthRef: MutableRefObject<number>;
  elevationRef: MutableRefObject<number>;
  zoomRef: MutableRefObject<number>;
  wasDraggingRef: MutableRefObject<boolean>;
  lastInteractionRef: MutableRefObject<number>;
}

interface DragState {
  rightDragging: boolean;
  prevX: number;
  prevY: number;
  leftDragDistance: number;
}

function nowS(): number { return performance.now() / 1000; }

function handleOrbitPointerDown(event: PointerEvent, state: DragState, cfg: OrbitListenersConfig): void {
  if (event.button === 2) {
    state.rightDragging = true;
    state.prevX = event.clientX;
    state.prevY = event.clientY;
    cfg.lastInteractionRef.current = nowS();
    return;
  }
  if (event.button === 0) {
    state.leftDragDistance = 0;
    cfg.wasDraggingRef.current = false;
    state.prevX = event.clientX;
    state.prevY = event.clientY;
  }
}

function applyOrbitDelta(dx: number, dy: number, cfg: OrbitListenersConfig): void {
  cfg.azimuthRef.current -= dx * CAMERA_ROTATE_SENSITIVITY;
  cfg.elevationRef.current = clamp(
    cfg.elevationRef.current - dy * CAMERA_ROTATE_SENSITIVITY,
    CAMERA_ORBIT_MIN_ELEVATION,
    CAMERA_ORBIT_MAX_ELEVATION,
  );
  cfg.lastInteractionRef.current = nowS();
}

function handleOrbitPointerMove(event: PointerEvent, state: DragState, cfg: OrbitListenersConfig): void {
  const dx = event.clientX - state.prevX;
  const dy = event.clientY - state.prevY;
  state.prevX = event.clientX;
  state.prevY = event.clientY;
  if (state.rightDragging) {
    applyOrbitDelta(dx, dy, cfg);
    return;
  }
  if (event.buttons & 1) {
    state.leftDragDistance += Math.hypot(dx, dy);
    if (state.leftDragDistance > CAMERA_DRAG_THRESHOLD_PX) cfg.wasDraggingRef.current = true;
  }
}

function attachOrbitListeners(cfg: OrbitListenersConfig): () => void {
  const state: DragState = { rightDragging: false, prevX: 0, prevY: 0, leftDragDistance: 0 };

  const onDown = (e: PointerEvent): void => handleOrbitPointerDown(e, state, cfg);
  const onMove = (e: PointerEvent): void => handleOrbitPointerMove(e, state, cfg);
  const onUp = (e: PointerEvent): void => { if (e.button === 2) state.rightDragging = false; };
  const onWheel = (e: WheelEvent): void => {
    cfg.zoomRef.current = clamp(
      cfg.zoomRef.current - e.deltaY * CAMERA_ZOOM_SENSITIVITY,
      CAMERA_ZOOM_MIN,
      CAMERA_ZOOM_MAX,
    );
    cfg.lastInteractionRef.current = nowS();
  };
  const onCtx = (e: MouseEvent): void => e.preventDefault();

  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('contextmenu', onCtx);
  return () => {
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('contextmenu', onCtx);
  };
}

export function HubCamera({ wasDraggingRef }: HubCameraProps): ReactElement {
  const camera = useThree((state) => state.camera) as OrthographicCameraImpl;
  const { pivotRef } = useHubGround();
  const azimuthRef = useRef(CAMERA_ORBIT_INITIAL_AZIMUTH);
  const elevationRef = useRef(CAMERA_ORBIT_INITIAL_ELEVATION);
  const zoomRef = useRef(CAMERA_ZOOM);
  const lastInteractionRef = useRef(0);
  const smoothedAzRef = useRef(CAMERA_ORBIT_INITIAL_AZIMUTH);
  const smoothedElRef = useRef(CAMERA_ORBIT_INITIAL_ELEVATION);
  const smoothedZoomRef = useRef(CAMERA_ZOOM);

  useEffect(() => attachOrbitListeners({
    azimuthRef,
    elevationRef,
    zoomRef,
    wasDraggingRef,
    lastInteractionRef,
  }), [wasDraggingRef]);

  useFrame((state, delta) => {
    if (!camera) return;
    const t = state.clock.getElapsedTime();
    const sinceInteract = t - lastInteractionRef.current;
    const idleFactor = clamp((sinceInteract - CAMERA_IDLE_DELAY_S) * 0.5, 0, 1);
    const driftAz = Math.sin(t * CAMERA_IDLE_FREQ_AZ) * CAMERA_IDLE_AZIMUTH_AMP * idleFactor;
    const driftEl = Math.sin(t * CAMERA_IDLE_FREQ_EL + 1.3) * CAMERA_IDLE_ELEVATION_AMP * idleFactor;

    const lerp = CAMERA_LERP_RATE * delta;
    smoothedAzRef.current = lerpAngle(smoothedAzRef.current, azimuthRef.current, lerp);
    smoothedElRef.current = lerpAngle(smoothedElRef.current, elevationRef.current, lerp);
    smoothedZoomRef.current = lerpAngle(smoothedZoomRef.current, zoomRef.current, lerp);

    applySphericalToCamera(camera, {
      pivot: pivotRef.current,
      azimuth: smoothedAzRef.current + driftAz,
      elevation: clamp(smoothedElRef.current + driftEl, CAMERA_ORBIT_MIN_ELEVATION, CAMERA_ORBIT_MAX_ELEVATION),
      zoom: smoothedZoomRef.current,
    });
  });

  return (
    <OrthographicCamera
      makeDefault
      position={[
        Math.sin(CAMERA_ORBIT_INITIAL_AZIMUTH) * Math.cos(CAMERA_ORBIT_INITIAL_ELEVATION) * CAMERA_ORBIT_RADIUS,
        Math.sin(CAMERA_ORBIT_INITIAL_ELEVATION) * CAMERA_ORBIT_RADIUS,
        Math.cos(CAMERA_ORBIT_INITIAL_AZIMUTH) * Math.cos(CAMERA_ORBIT_INITIAL_ELEVATION) * CAMERA_ORBIT_RADIUS,
      ]}
      zoom={CAMERA_ZOOM}
      near={0.1}
      far={300}
    />
  );
}
