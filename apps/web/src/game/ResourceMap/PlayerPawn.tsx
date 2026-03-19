import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PathNode, CombatPlayer } from '@game/shared-types';

const MOVE_SPEED = 4.5;
const ANIM_SPEED = 12;
const IDLE_FRAMES = 6;
const WALK_FRAMES = 8;

interface PlayerPawnProps {
  gridPosition: PathNode;
  gridSize: number;
  path: PathNode[] | null;
  onPathComplete: () => void;
  playerData?: CombatPlayer;
}

function toWorld(gx: number, gy: number, gridSize: number): [number, number, number] {
  return [gx - gridSize / 2 + 0.5, 0, gy - gridSize / 2 + 0.5];
}

export function PlayerPawn({ gridPosition, gridSize, path, onPathComplete, playerData }: PlayerPawnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera, scene } = useThree();
  const [isMoving, setIsMoving] = useState(false);
  const [currentPath, setCurrentPath] = useState<PathNode[]>([]);
  const [pathIndex, setPathIndex] = useState(0);
  const [shouldFlip, setShouldFlip] = useState(false);
  
  const progressRef = useRef(0);
  const animFrameRef = useRef(0);
  const frameCounterRef = useRef(0);

  const fromRef = useRef<[number, number, number]>(toWorld(gridPosition.x, gridPosition.y, gridSize));
  const toRef = useRef<[number, number, number]>(toWorld(gridPosition.x, gridPosition.y, gridSize));

  const spriteType = useMemo(() => {
    if (!playerData) return 'soldier';
    const name = (playerData.username || '').toLowerCase();
    if (name.includes('mage') || name.includes('orc')) return 'orc';
    return 'soldier';
  }, [playerData]);

  // Charger et isoler les textures
  const texIdle = useLoader(THREE.TextureLoader, `/assets/sprites/${spriteType}/idle.png`);
  const texWalk = useLoader(THREE.TextureLoader, `/assets/sprites/${spriteType}/walk.png`);

  const { textureIdle, textureWalk } = useMemo(() => {
    const tIdle = texIdle.clone();
    const tWalk = texWalk.clone();
    
    // Config Idle (600px -> 6 frames)
    tIdle.magFilter = tIdle.minFilter = THREE.NearestFilter;
    tIdle.generateMipmaps = false;
    tIdle.colorSpace = THREE.SRGBColorSpace;
    tIdle.wrapS = tIdle.wrapT = THREE.ClampToEdgeWrapping;
    tIdle.repeat.set(1 / IDLE_FRAMES, 1);
    
    // Config Walk (800px -> 8 frames)
    tWalk.magFilter = tWalk.minFilter = THREE.NearestFilter;
    tWalk.generateMipmaps = false;
    tWalk.colorSpace = THREE.SRGBColorSpace;
    tWalk.wrapS = tWalk.wrapT = THREE.ClampToEdgeWrapping;
    tWalk.repeat.set(1 / WALK_FRAMES, 1);
    
    tIdle.needsUpdate = true;
    tWalk.needsUpdate = true;
    
    return { textureIdle: tIdle, textureWalk: tWalk };
  }, [texIdle, texWalk]);

  useEffect(() => {
    if (path && path.length > 0) {
      setCurrentPath(path);
      setPathIndex(0);
      setIsMoving(true);
      progressRef.current = 0;
      const [wx, , wz] = groupRef.current
        ? [groupRef.current.position.x, 0, groupRef.current.position.z]
        : toWorld(gridPosition.x, gridPosition.y, gridSize);
      fromRef.current = [wx, 0, wz];
      toRef.current = toWorld(path[0].x, path[0].y, gridSize);
    }
  }, [path]);

  useFrame((state, delta) => {
    // 1. Animation stable (6 pour Idle, 8 pour Walk)
    const frames = isMoving ? WALK_FRAMES : IDLE_FRAMES;
    frameCounterRef.current += delta * ANIM_SPEED;
    if (frameCounterRef.current >= 1) {
       animFrameRef.current = (animFrameRef.current + 1) % frames;
       frameCounterRef.current = 0;
       
       const activeTex = isMoving ? textureWalk : textureIdle;
       if (spriteRef.current) {
          spriteRef.current.material.map = activeTex;
          activeTex.offset.x = animFrameRef.current / frames;
       }
    }

    // 2. Déplacement souple
    if (!isMoving || !groupRef.current || currentPath.length === 0) {
        if (!isMoving && groupRef.current) {
            const targetPos = toWorld(gridPosition.x, gridPosition.y, gridSize);
            groupRef.current.position.lerp(new THREE.Vector3(targetPos[0], 0, targetPos[2]), 0.1);
        }
    } else {
        progressRef.current += delta * MOVE_SPEED;
        const t = Math.min(progressRef.current, 1);
        const x = THREE.MathUtils.lerp(fromRef.current[0], toRef.current[0], t);
        const z = THREE.MathUtils.lerp(fromRef.current[2], toRef.current[2], t);
        groupRef.current.position.set(x, 0, z);

        if (t >= 1) {
          const nextIndex = pathIndex + 1;
          if (nextIndex < currentPath.length) {
            fromRef.current = [...toRef.current];
            toRef.current = toWorld(currentPath[nextIndex].x, currentPath[nextIndex].y, gridSize);
            setPathIndex(nextIndex);
            progressRef.current = 0;
          } else {
            groupRef.current.position.set(toRef.current[0], 0, toRef.current[2]);
            setIsMoving(false);
            setCurrentPath([]);
            setPathIndex(0);
            onPathComplete();
          }
        }
    }

    // 3. Orientation dynamique par rapport à la caméra
    // On veut faire face au centre si on n'a pas d'autre cible,
    // mais ici on va juste comparer la position X par rapport au centre de la map projeté
    if (groupRef.current) {
        const screenPos = new THREE.Vector3().setFromMatrixPosition(groupRef.current.matrixWorld).project(camera);
        // On calcule une direction par défaut : si on est à droite de l'écran, on regarde à gauche
        const isRightScreen = screenPos.x > 0;
        const isOrc = spriteType === 'orc';
        setShouldFlip(isOrc ? isRightScreen : !isRightScreen);
    }
  });

  const initialWorld = toWorld(gridPosition.x, gridPosition.y, gridSize);

  return (
    <group ref={groupRef} position={initialWorld}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.4} />
      </mesh>

      <sprite 
        ref={spriteRef} 
        position={[0, 0.75, 0]} 
        scale={[shouldFlip ? -6.0 : 6.0, 6.0, 1]}
      >
        <spriteMaterial 
            map={textureIdle} 
            transparent={true} 
            alphaTest={0.5}
            // Force le pixel art sans flou ni débordement
            precision="highp"
        />
      </sprite>
    </group>
  );
}
