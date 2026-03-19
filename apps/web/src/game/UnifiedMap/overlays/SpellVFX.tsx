import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleTrail } from './ParticleTrail';
import { FireballParticles } from './FireballVFX';

interface SpellVFXProps {
  type: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}

export function SpellVFX({ type, from, to, onComplete }: SpellVFXProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // recalage -4.5 pour correspondre au toWorld des persos (gridSize: 10)
  const startPos = new THREE.Vector3(from.x - 4.5, 0.8, from.y - 4.5);
  const endPos = new THREE.Vector3(to.x - 4.5, 0.8, to.y - 4.5);
  const [progress, setProgress] = useState(0);

  useFrame((_, delta) => {
    if (progress >= 1) {
      onComplete();
      return;
    }
    setProgress((p) => Math.min(p + delta * 2.8, 1)); // Légèrement plus rapide
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(startPos, endPos, progress);
    }
  });

  if (type === 'Boule de Feu' || type === 'spell-fireball' || type === 'spell-frappe' || type === 'spell-kunai') {
    const isFire = type.includes('fire') || type.includes('Boule');
    
    return (
      <group>
        <mesh ref={meshRef}>
          <sphereGeometry args={[isFire ? 0.35 : 0.2, 16, 16]} />
          <meshStandardMaterial 
             color={isFire ? "#ff0000" : "#94a3b8"} 
             emissive={isFire ? "#cc0000" : "#64748b"} 
             emissiveIntensity={isFire ? 8 : 2} 
          />
          {isFire && <pointLight color="#ff0000" intensity={5} distance={5} decay={2} />}
          {isFire && <FireballParticles count={45} />}
          {!isFire && <ParticleTrail position={new THREE.Vector3(0,0,0)} color="#cbd5e1" count={15} spread={0.3} />}
        </mesh>
      </group>
    );
  }

  if (type === 'spell-heal') {
    return (
      <group>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#16a34a"
            emissiveIntensity={2}
            transparent
            opacity={0.7}
          />
          <pointLight color="#22c55e" intensity={1.5} distance={2} />
        </mesh>
        <ParticleTrail position={new THREE.Vector3(0,0,0)} color="#86efac" count={40} spread={0.8} />
      </group>
    );
  }

  return null;
}
