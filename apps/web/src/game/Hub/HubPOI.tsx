import React, { useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HubPoiDef } from './hubMap';

interface HubPOIProps {
  poi: HubPoiDef;
  mapSize: number;
  isNear: boolean;
}

function toWorld(gx: number, gy: number, mapSize: number): [number, number, number] {
  return [gx - mapSize / 2 + 0.5, 0, gy - mapSize / 2 + 0.5];
}

export const HubPOI = React.memo(({ poi, mapSize, isNear }: HubPOIProps) => {
  const [wx, , wz] = toWorld(poi.position.x, poi.position.y, mapSize);
  const crystalRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * (isNear ? 1.6 : 0.7);
      // Subtle hover bobbing for the crystal
      crystalRef.current.position.y = 0.55 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (isNear ? 1.4 : 0.5) + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  const stoneColor = isNear ? '#b59864' : '#7a7168';
  const discColor = isNear ? '#ffe066' : '#89b4e0';
  const discEmissive = isNear ? '#ffc940' : '#4878b4';
  const crystalColor = isNear ? '#ffe066' : '#a8cce8';

  return (
    <group position={[wx, 0, wz]}>
      {/* Stone pedestal base — broad and short, planted on the ground */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.24, 12]} />
        <meshStandardMaterial color={stoneColor} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Stone plinth (narrower, on top of base) */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.12, 12]} />
        <meshStandardMaterial color={stoneColor} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Glowing rune disc on top */}
      <mesh
        ref={glowRef}
        position={[0, 0.37, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.3, 24]} />
        <meshStandardMaterial
          color={discColor}
          emissive={discEmissive}
          emissiveIntensity={isNear ? 1.4 : 0.5}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Small floating crystal — hovers just above the pedestal */}
      <mesh ref={crystalRef} position={[0, 0.55, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color={crystalColor}
          emissive={crystalColor}
          emissiveIntensity={isNear ? 2.0 : 0.6}
          transparent
          opacity={0.95}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      {/* Label billboard — closer to the pedestal */}
      <Billboard position={[0, 1.0, 0]}>
        <Text
          fontSize={0.28}
          color={isNear ? '#ffe066' : '#b0c0d0'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.035}
          outlineColor="#000000"
        >
          {poi.icon} {poi.label}
        </Text>
      </Billboard>
    </group>
  );
});
