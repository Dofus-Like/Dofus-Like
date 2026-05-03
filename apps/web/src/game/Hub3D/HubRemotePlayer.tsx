import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { Vector3, type Group } from 'three';

import type { HubChatMessage, HubPlayerSnapshot } from '@game/shared-types';

import { HubPawn } from './HubPawn';
import { useHubGround } from './HubGround';
import { ARRIVAL_THRESHOLD, PLAYER_SPEED, PLAYER_VERTICAL_OFFSET } from './constants';

const TARGET = new Vector3();
const STEP = new Vector3();
const TELEPORT_THRESHOLD = 6;
const BUBBLE_TTL_MS = 4000;

interface HubRemotePlayerProps {
  snapshot: HubPlayerSnapshot;
  lastMessage?: HubChatMessage;
}

function moveGroup(group: Group, target: Vector3, delta: number, snapY: (x: number, z: number) => number): void {
  STEP.set(target.x - group.position.x, 0, target.z - group.position.z);
  const distance = STEP.length();
  if (distance < ARRIVAL_THRESHOLD) {
    group.position.x = target.x;
    group.position.z = target.z;
    group.position.y = snapY(group.position.x, group.position.z);
    return;
  }
  const step = Math.min(PLAYER_SPEED * delta, distance);
  STEP.divideScalar(distance);
  group.position.x += STEP.x * step;
  group.position.z += STEP.z * step;
  group.position.y = snapY(group.position.x, group.position.z);
}

function maybeTeleport(group: Group, snapshot: HubPlayerSnapshot): void {
  const dx = group.position.x - snapshot.position.x;
  const dz = group.position.z - snapshot.position.z;
  if (Math.hypot(dx, dz) > TELEPORT_THRESHOLD) {
    group.position.set(snapshot.position.x, group.position.y, snapshot.position.z);
  }
}

export function HubRemotePlayer({ snapshot, lastMessage }: HubRemotePlayerProps): ReactElement {
  const ref = useRef<Group>(null);
  const { snapY, ready } = useHubGround();
  const [initialPos] = useState<[number, number, number]>(() => [
    snapshot.position.x,
    snapshot.position.x === 0 && snapshot.position.z === 0 ? 0 : snapY(snapshot.position.x, snapshot.position.z),
    snapshot.position.z,
  ]);

  useEffect(() => {
    const group = ref.current;
    if (!group || !ready) return;
    maybeTeleport(group, snapshot);
  }, [snapshot, ready]);

  useFrame((_, delta): void => {
    const group = ref.current;
    if (!group) return;
    const target = snapshot.target ?? snapshot.position;
    TARGET.set(target.x, 0, target.z);
    moveGroup(group, TARGET, delta, snapY);
  });

  return (
    <group ref={ref} position={initialPos}>
      <HubPawn skinId={snapshot.skin} />
      <NameTag username={snapshot.username} />
      {lastMessage ? <ChatBubble message={lastMessage} /> : null}
    </group>
  );
}

const NAME_STYLE: CSSProperties = {
  background: 'rgba(7, 16, 31, 0.78)',
  border: '1px solid rgba(212, 169, 106, 0.35)',
  color: '#f4e9d6',
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  fontFamily: 'system-ui, sans-serif',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  transform: 'translate(-50%, -100%)',
};

function NameTag({ username }: { username: string }): ReactElement {
  return (
    <Html position={[0, PLAYER_VERTICAL_OFFSET + 1.4, 0]} center occlude={false} zIndexRange={[20, 0]}>
      <div style={NAME_STYLE}>{username}</div>
    </Html>
  );
}

const BUBBLE_STYLE: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.94)',
  color: '#1a1a1a',
  padding: '6px 10px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'system-ui, sans-serif',
  display: 'inline-block',
  width: 'max-content',
  maxWidth: 280,
  pointerEvents: 'none',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  transform: 'translate(-50%, -100%)',
  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
  textAlign: 'center',
};

function ChatBubble({ message }: { message: HubChatMessage }): ReactElement | null {
  const expiresAt = useMemo(() => message.sentAt + BUBBLE_TTL_MS, [message]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return (): void => window.clearInterval(t);
  }, []);
  if (now > expiresAt) return null;
  return (
    <Html position={[0, PLAYER_VERTICAL_OFFSET + 2.1, 0]} center occlude={false} zIndexRange={[30, 0]}>
      <div style={BUBBLE_STYLE}>{message.text}</div>
    </Html>
  );
}
