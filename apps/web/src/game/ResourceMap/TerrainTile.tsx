import React, { useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { TerrainType, TERRAIN_PROPERTIES, CombatTerrainType } from '@game/shared-types';

const TERRAIN_COLORS: Record<TerrainType, { base: string; hover: string }> = {
  [TerrainType.GROUND]: { base: '#374151', hover: '#4b5563' },
  [TerrainType.IRON]: { base: '#78716c', hover: '#a8a29e' },
  [TerrainType.LEATHER]: { base: '#92400e', hover: '#b45309' },
  [TerrainType.CRYSTAL]: { base: '#7c3aed', hover: '#a78bfa' },
  [TerrainType.FABRIC]: { base: '#a855f7', hover: '#c084fc' },
  [TerrainType.WOOD]: { base: '#166534', hover: '#22c55e' },
  [TerrainType.HERB]: { base: '#4ade80', hover: '#86efac' },
  [TerrainType.GOLD]: { base: '#d97706', hover: '#fbbf24' },
};

export interface TileHoverInfo {
  x: number;
  y: number;
  terrain: TerrainType;
}

interface TerrainTileProps {
  x: number;
  y: number;
  terrain: TerrainType;
  gridSize: number;
  onTileClick?: (x: number, y: number, terrain: TerrainType) => void;
  onTileHover?: (info: TileHoverInfo | null) => void;
}

function WallObstacle({
  position,
  color,
  height,
}: {
  position: [number, number, number];
  color: string;
  height: number;
}) {
  return (
    <mesh position={[position[0], height / 2, position[2]]}>
      <boxGeometry args={[0.7, height, 0.7]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function HoleTerrain({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group>
      <mesh position={[position[0], -0.15, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.82, 0.82]} />
        <meshStandardMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[position[0], -0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 12]} />
        <meshStandardMaterial color="#78350f" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function FlatResource({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={[position[0], 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.25, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function TerrainTile({ x, y, terrain, gridSize, onTileClick, onTileHover }: TerrainTileProps) {
  const [hovered, setHovered] = useState(false);
  const colors = TERRAIN_COLORS[terrain];
  const props = TERRAIN_PROPERTIES[terrain];

  const worldX = x - gridSize / 2;
  const worldZ = y - gridSize / 2;
  const pos: [number, number, number] = [worldX, 0, worldZ];

  const tileColor = hovered ? colors.hover : colors.base;

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    if (onTileHover) onTileHover({ x, y, terrain });
  };

  const handlePointerOut = () => {
    setHovered(false);
    if (onTileHover) onTileHover(null);
  };

  const baseColor = props.combatType === CombatTerrainType.HOLE
    ? '#1a1a0f'
    : tileColor;

  return (
    <group>
      <mesh
        position={[worldX, 0, worldZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (onTileClick) onTileClick(x, y, terrain);
        }}
      >
        <planeGeometry args={[0.92, 0.92]} />
        <meshStandardMaterial color={baseColor} />
      </mesh>

      {props.combatType === CombatTerrainType.WALL && (
        <WallObstacle
          position={pos}
          color={hovered ? colors.hover : colors.base}
          height={terrain === TerrainType.WOOD ? 1.0 : 0.6}
        />
      )}

      {props.combatType === CombatTerrainType.HOLE && (
        <HoleTerrain
          position={pos}
          color={hovered ? colors.hover : colors.base}
        />
      )}

      {props.combatType === CombatTerrainType.FLAT && props.harvestable && (
        <FlatResource
          position={pos}
          color={hovered ? colors.hover : colors.base}
        />
      )}

      {hovered && props.harvestable && (
        <mesh position={[worldX, 0.01, worldZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.45, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
