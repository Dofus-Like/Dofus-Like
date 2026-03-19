import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PathNode, CombatPlayer } from '@game/shared-types';

const MOVE_SPEED = 4.5;
const ANIM_SPEED = 12;
const IDLE_FRAMES = 6;
const WALK_FRAMES = 8;
const ATTACK_FRAMES = 6;

interface PlayerPawnProps {
  gridPosition: PathNode;
  gridSize: number;
  path: PathNode[] | null;
  onPathComplete: () => void;
  playerData?: CombatPlayer;
}

export type PlayerPawnHandle = {
  triggerAttack: () => void;
};

function toWorld(gx: number, gy: number, gridSize: number): [number, number, number] {
  return [gx - gridSize / 2 + 0.5, 0, gy - gridSize / 2 + 0.5];
}

export const PlayerPawn = React.forwardRef<PlayerPawnHandle, PlayerPawnProps>(
  ({ gridPosition, gridSize, path, onPathComplete, playerData }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const spriteRef = useRef<THREE.Sprite>(null);
    const { camera } = useThree();
    
    const [isMoving, setIsMoving] = useState(false);
    const [isAttacking, setIsAttacking] = useState(false);
    
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
    const texAttack = useLoader(THREE.TextureLoader, `/assets/sprites/${spriteType}/attack.png`);

    const { textureIdle, textureWalk, textureAttack } = useMemo(() => {
      const tIdle = texIdle.clone();
      const tWalk = texWalk.clone();
      const tAttack = texAttack.clone();
      
      // Config Idle (6 frames)
      tIdle.magFilter = tIdle.minFilter = THREE.NearestFilter;
      tIdle.generateMipmaps = false;
      tIdle.colorSpace = THREE.SRGBColorSpace;
      tIdle.wrapS = tIdle.wrapT = THREE.ClampToEdgeWrapping;
      tIdle.repeat.set(1 / IDLE_FRAMES, 1);
      
      // Config Walk (8 frames)
      tWalk.magFilter = tWalk.minFilter = THREE.NearestFilter;
      tWalk.generateMipmaps = false;
      tWalk.colorSpace = THREE.SRGBColorSpace;
      tWalk.wrapS = tWalk.wrapT = THREE.ClampToEdgeWrapping;
      tWalk.repeat.set(1 / WALK_FRAMES, 1);

      // Config Attack (6 frames)
      tAttack.magFilter = tAttack.minFilter = THREE.NearestFilter;
      tAttack.generateMipmaps = false;
      tAttack.colorSpace = THREE.SRGBColorSpace;
      tAttack.wrapS = tAttack.wrapT = THREE.ClampToEdgeWrapping;
      tAttack.repeat.set(1 / ATTACK_FRAMES, 1);
      
      tIdle.needsUpdate = true;
      tWalk.needsUpdate = true;
      tAttack.needsUpdate = true;
      
      return { textureIdle: tIdle, textureWalk: tWalk, textureAttack: tAttack };
    }, [texIdle, texWalk, texAttack]);

    // Exposer triggerAttack
    React.useImperativeHandle(ref, () => ({
      triggerAttack: () => {
        setIsAttacking(true);
        animFrameRef.current = 0;
        frameCounterRef.current = 0;
      }
    }));

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
      // 1. Animation stable
      let frames = IDLE_FRAMES;
      let activeTex = textureIdle;

      if (isAttacking) {
        frames = ATTACK_FRAMES;
        activeTex = textureAttack;
      } else if (isMoving) {
        frames = WALK_FRAMES;
        activeTex = textureWalk;
      }

      frameCounterRef.current += delta * (isAttacking ? ANIM_SPEED * 0.8 : ANIM_SPEED);
      if (frameCounterRef.current >= 1) {
         if (isAttacking) {
            animFrameRef.current++;
            if (animFrameRef.current >= frames) {
                setIsAttacking(false);
                animFrameRef.current = 0;
            }
         } else {
            animFrameRef.current = (animFrameRef.current + 1) % frames;
         }
         frameCounterRef.current = 0;
         
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

      // 3. Orientation dynamique
      if (groupRef.current) {
          const screenPos = new THREE.Vector3().setFromMatrixPosition(groupRef.current.matrixWorld).project(camera);
          const isRightScreen = screenPos.x > 0;
          const isOrc = spriteType === 'orc';
          setShouldFlip(isOrc ? isRightScreen : !isRightScreen);
      }
    });

    const initialWorld = toWorld(gridPosition.x, gridPosition.y, gridSize);

    return (
      <group ref={groupRef} position={initialWorld}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 16]} />
          <meshBasicMaterial color="black" transparent opacity={0.5} />
        </mesh>

        <sprite 
          ref={spriteRef} 
          position={[0, 0.45, 0]} 
          scale={[shouldFlip ? -6.0 : 6.0, 6.0, 1]}
        >
          <spriteMaterial 
              map={textureIdle} 
              transparent={true} 
              alphaTest={0.5}
              precision="highp"
          />
        </sprite>
      </group>
    );
  }
);
