import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useCallback, useMemo, useState, type CSSProperties, type ReactElement } from 'react';

import { useHubGround } from './HubGround';
import { HubPOIAsset } from './HubPOIAsset';
import type { PoiConfig } from './constants';

interface HubPOIProps {
  poi: PoiConfig;
  modalOpen: boolean;
}

const COLLIDER_HEIGHT = 4.0;
const COLLIDER_RADIUS = 2.5;
const LABEL_Y = 1.85;

function buildLabelStyle(color: string, hovered: boolean, dimmed: boolean): CSSProperties {
  return {
    pointerEvents: 'none',
    background: 'rgba(10, 14, 24, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    fontFamily: 'system-ui, sans-serif',
    border: `1px solid ${color}`,
    boxShadow: `0 0 12px ${color}55, inset 0 0 8px ${color}22`,
    transform: hovered && !dimmed ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
    transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 220ms ease',
    userSelect: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    letterSpacing: '0.02em',
    opacity: dimmed ? 0.18 : 1,
  };
}

function PoiLabel({ poi, hovered, dimmed }: { poi: PoiConfig; hovered: boolean; dimmed: boolean }): ReactElement {
  return (
    <Html position={[0, LABEL_Y, 0]} center sprite style={{ pointerEvents: 'none' }}>
      <div style={buildLabelStyle(poi.color, hovered, dimmed)}>
        <span style={{ fontSize: '14px' }}>{poi.icon}</span>
        <span>{poi.label}</span>
      </div>
    </Html>
  );
}

export function HubPOI({ poi, modalOpen }: HubPOIProps): ReactElement {
  const [hovered, setHovered] = useState(false);
  const { snapY, ready } = useHubGround();
  const groundY = useMemo(
    () => snapY(poi.position[0], poi.position[2]),
    [snapY, poi.position, ready],
  );

  const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>): void => {
    if (modalOpen) return;
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
  }, [modalOpen]);

  const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    document.body.style.cursor = '';
    setHovered(false);
  }, []);

  const effectiveHover = hovered && !modalOpen;

  return (
    <group position={[poi.position[0], groundY, poi.position[2]]}>
      <HubPOIAsset poi={poi} hovered={effectiveHover} />
      {!modalOpen && (
        <mesh
          position={[0, COLLIDER_HEIGHT / 2, 0]}
          userData={{ poiId: poi.id }}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <cylinderGeometry args={[COLLIDER_RADIUS, COLLIDER_RADIUS, COLLIDER_HEIGHT, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
      <PoiLabel poi={poi} hovered={effectiveHover} dimmed={modalOpen} />
    </group>
  );
}
