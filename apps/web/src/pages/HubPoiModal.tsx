import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';

import { HUB_POIS, type PoiId } from '../game/Hub3D/constants';
import { SKINS, type SkinConfig } from '../game/constants/skins';

const STYLE_TAG_ID = 'hub-poi-modal-anims';
const ANIM_OPEN_MS = 280;
const ANIM_CLOSE_MS = 200;

const ANIM_STYLES = `
@keyframes hub-modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes hub-modal-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes hub-modal-card-in {
  0% { opacity: 0; transform: translateY(18px) scale(0.92); }
  60% { opacity: 1; transform: translateY(-3px) scale(1.015); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes hub-modal-card-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(8px) scale(0.96); }
}
.hub-modal-backdrop-in { animation: hub-modal-backdrop-in ${ANIM_OPEN_MS}ms ease-out forwards; }
.hub-modal-backdrop-out { animation: hub-modal-backdrop-out ${ANIM_CLOSE_MS}ms ease-in forwards; }
.hub-modal-card-in { animation: hub-modal-card-in ${ANIM_OPEN_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.hub-modal-card-out { animation: hub-modal-card-out ${ANIM_CLOSE_MS}ms ease-in forwards; }
`;

function ensureAnimStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.textContent = ANIM_STYLES;
  document.head.appendChild(tag);
}

export interface RoomEntry {
  id: string;
  player1Id: string;
  createdAt: string;
  p1: { username: string };
}

interface CombatActions {
  isInQueue: boolean;
  hasOpenSession: boolean;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
}

interface VsAiActions {
  hasOpenSession: boolean;
  isInQueue: boolean;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
}

interface AppearanceActions {
  currentSkin: string | undefined;
  username: string | undefined;
  gold: number | undefined;
  onSetSkin: (id: string) => void;
}

interface RoomsActions {
  rooms: RoomEntry[];
  loading: boolean;
  isWaiting: boolean;
  hasOpenSession: boolean;
  isInQueue: boolean;
  playerId: string | undefined;
  onCreateRoom: () => void;
  onJoinRoom: (id: string) => void;
  onCancelRoom: () => void;
}

export interface HubPoiModalProps {
  activePoiId: PoiId | null;
  onClose: () => void;
  combat: CombatActions;
  vsAi: VsAiActions;
  appearance: AppearanceActions;
  rooms: RoomsActions;
}

const OVERLAY: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  background: 'rgba(0, 0, 0, 0.6)',
};

const DESC: CSSProperties = {
  color: 'rgba(255,255,255,0.65)',
  fontSize: '0.9rem',
  lineHeight: 1.6,
  margin: '0 0 20px',
};

const FAINT: CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.82rem',
  margin: '10px 0 0',
};

const IDLE_SPRITE_FRAMES = 6;

function buildModalStyle(color: string): CSSProperties {
  return {
    background: 'rgba(10, 14, 24, 0.94)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${color}55`,
    boxShadow: `0 0 40px ${color}25, inset 0 0 20px ${color}08`,
    borderRadius: '20px',
    padding: '32px',
    minWidth: '340px',
    maxWidth: '520px',
    width: '90%',
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
    position: 'relative',
    maxHeight: '80vh',
    overflowY: 'auto',
  };
}

function btnPrimary(color: string, disabled = false): CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.08)' : color,
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    width: '100%',
    marginTop: '8px',
    display: 'block',
    textAlign: 'center',
  };
}

function btnSecondary(): CSSProperties {
  return {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)',
    color: 'rgba(255,255,255,0.65)',
    padding: '10px 24px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    width: '100%',
    marginTop: '8px',
    display: 'block',
    textAlign: 'center',
  };
}

function renderPanel(id: PoiId, props: HubPoiModalProps): ReactElement {
  if (id === 'combat') return <CombatPanel {...props.combat} />;
  if (id === 'vs-ai') return <VsAiPanel {...props.vsAi} />;
  if (id === 'appearance') return <AppearancePanel {...props.appearance} />;
  return <RoomsPanel {...props.rooms} />;
}

function useModalLifecycle(activePoiId: PoiId | null): { renderedId: PoiId | null; closing: boolean } {
  const [renderedId, setRenderedId] = useState<PoiId | null>(activePoiId);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    ensureAnimStyles();
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (activePoiId) {
      setRenderedId(activePoiId);
      setClosing(false);
      return;
    }
    if (renderedId === null) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setRenderedId(null);
      setClosing(false);
      closeTimerRef.current = null;
    }, ANIM_CLOSE_MS);
  }, [activePoiId, renderedId]);

  useEffect((): (() => void) => (): void => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  return { renderedId, closing };
}

export function HubPoiModal(props: HubPoiModalProps): ReactElement | null {
  const { activePoiId, onClose } = props;
  const { renderedId, closing } = useModalLifecycle(activePoiId);

  if (!renderedId) return null;

  const poiConfig = Object.values(HUB_POIS).find((p) => p.id === renderedId);
  const color = poiConfig?.color ?? '#888888';
  const backdropClass = closing ? 'hub-modal-backdrop-out' : 'hub-modal-backdrop-in';
  const cardClass = closing ? 'hub-modal-card-out' : 'hub-modal-card-in';

  return (
    <div style={OVERLAY} className={backdropClass} onClick={onClose}>
      <div
        style={buildModalStyle(color)}
        className={cardClass}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <ModalHeader color={color} icon={poiConfig?.icon ?? ''} label={poiConfig?.label ?? ''} onClose={onClose} />
        {renderPanel(renderedId, props)}
      </div>
    </div>
  );
}

function ModalHeader({ color, icon, label, onClose }: { color: string; icon: string; label: string; onClose: () => void }): ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
      <div>
        <span style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color, letterSpacing: '-0.01em' }}>{label}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: `1px solid ${color}44`,
          color: 'rgba(255,255,255,0.5)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          cursor: 'pointer',
          fontSize: '14px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}

function CombatPanel({ isInQueue, hasOpenSession, onJoinQueue, onLeaveQueue }: CombatActions): ReactElement {
  if (isInQueue) {
    return (
      <div>
        <p style={DESC}>Recherche d'un adversaire en cours...</p>
        <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: '16px', fontSize: '0.9rem' }}>⏳ En file d'attente</p>
        <button type="button" style={btnSecondary()} onClick={onLeaveQueue}>Annuler la recherche</button>
      </div>
    );
  }
  return (
    <div>
      <p style={DESC}>Affrontez un adversaire aléatoire en PvP. La partie commence dès qu'un match est trouvé.</p>
      <button type="button" style={btnPrimary('#ef4444', hasOpenSession)} disabled={hasOpenSession} onClick={onJoinQueue}>
        ⚔️ Lancer la recherche
      </button>
      {hasOpenSession && <p style={FAINT}>Terminez d'abord votre session en cours.</p>}
    </div>
  );
}

function VsAiPanel({ hasOpenSession, isInQueue, onStart, onResume, onReset }: VsAiActions): ReactElement {
  if (hasOpenSession) {
    return (
      <div>
        <p style={DESC}>Une session est déjà en cours.</p>
        <button type="button" style={btnPrimary('#10b981')} onClick={onResume}>▶ Reprendre la partie</button>
        <button type="button" style={btnSecondary()} onClick={onReset}>🔄 Réinitialiser la session</button>
      </div>
    );
  }
  return (
    <div>
      <p style={DESC}>Lancez un combat solo contre l'intelligence artificielle.</p>
      <button type="button" style={btnPrimary('#f59e0b', isInQueue)} disabled={isInQueue} onClick={onStart}>
        🤖 Lancer VS AI
      </button>
      {isInQueue && <p style={FAINT}>Quittez la file d'attente d'abord.</p>}
    </div>
  );
}

interface BannerPreset { id: string; name: string; gradient: string; }
interface FramePreset { id: string; name: string; border: string; glow: string; }

const BANNER_PRESETS: BannerPreset[] = [
  { id: 'arcane', name: 'Arcane', gradient: 'linear-gradient(135deg, #6d28d9 0%, #c084fc 50%, #312e81 100%)' },
  { id: 'forge', name: 'Forge', gradient: 'linear-gradient(135deg, #b91c1c 0%, #f59e0b 60%, #1f2937 100%)' },
  { id: 'verdant', name: 'Verdant', gradient: 'linear-gradient(135deg, #065f46 0%, #34d399 60%, #064e3b 100%)' },
  { id: 'tide', name: 'Marée', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #38bdf8 60%, #0f172a 100%)' },
];

const FRAME_PRESETS: FramePreset[] = [
  { id: 'gilded', name: 'Doré', border: '2px solid #fbbf24', glow: '0 0 18px #fbbf2455' },
  { id: 'silver', name: 'Argent', border: '2px solid #cbd5e1', glow: '0 0 16px #cbd5e144' },
  { id: 'obsidian', name: 'Obsidienne', border: '2px solid #1f2937', glow: '0 0 14px #93c5fd33' },
  { id: 'rose', name: 'Rose', border: '2px solid #f472b6', glow: '0 0 18px #f472b655' },
];

const SECTION_HEADER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '18px 0 10px',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.55)',
};

function getActiveBanner(id: string): BannerPreset {
  return BANNER_PRESETS.find((b) => b.id === id) ?? BANNER_PRESETS[0];
}

function getActiveFrame(id: string): FramePreset {
  return FRAME_PRESETS.find((f) => f.id === id) ?? FRAME_PRESETS[0];
}

function SkinAvatar({ skin, size, frame }: { skin: SkinConfig | undefined; size: number; frame?: FramePreset }): ReactElement {
  if (!skin) return <div style={{ width: size, height: size }} />;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.18,
      backgroundImage: `url(/assets/sprites/${skin.type}/idle.png)`,
      backgroundSize: `${IDLE_SPRITE_FRAMES * 100}% 100%`,
      backgroundPosition: '0% 0%',
      backgroundRepeat: 'no-repeat',
      filter: `hue-rotate(${skin.hue}deg) saturate(${skin.saturation})`,
      flexShrink: 0,
      border: frame?.border,
      boxShadow: frame?.glow,
      background: 'rgba(255,255,255,0.04)',
      backgroundBlendMode: 'normal',
    }} />
  );
}

function ProfileHeader({ username, gold, skin, banner, frame }: {
  username: string | undefined;
  gold: number | undefined;
  skin: SkinConfig | undefined;
  banner: BannerPreset;
  frame: FramePreset;
}): ReactElement {
  return (
    <div style={{
      position: 'relative',
      borderRadius: '14px',
      padding: '16px 18px',
      background: banner.gradient,
      marginBottom: '4px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px rgba(0,0,0,0.35)',
      display: 'flex',
      gap: '14px',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      <SkinAvatar skin={skin} size={64} frame={frame} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {username ?? 'Aventurier'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', marginTop: '4px', display: 'flex', gap: '12px' }}>
          <span>🪙 {gold ?? 0}</span>
          <span style={{ opacity: 0.7 }}>{skin?.name ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}

function SkinCard({ skin, isActive, onSelect }: { skin: SkinConfig; isActive: boolean; onSelect: () => void }): ReactElement {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        borderRadius: '12px',
        cursor: 'pointer',
        background: isActive ? 'rgba(192,132,252,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? '#c084fc' : 'rgba(255,255,255,0.08)'}`,
        marginBottom: '8px',
        transition: 'background 160ms ease, border-color 160ms ease',
      }}
    >
      <SkinAvatar skin={skin} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{skin.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {skin.description}
        </div>
      </div>
      {isActive && <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800, flexShrink: 0 }}>ACTIF</span>}
    </div>
  );
}

function BannerSwatch({ preset, isActive, onSelect }: { preset: BannerPreset; isActive: boolean; onSelect: () => void }): ReactElement {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      title={preset.name}
      style={{
        flex: 1,
        height: '46px',
        borderRadius: '10px',
        cursor: 'pointer',
        background: preset.gradient,
        border: `2px solid ${isActive ? '#ffffff' : 'rgba(255,255,255,0.12)'}`,
        boxShadow: isActive ? '0 0 14px rgba(255,255,255,0.35)' : 'inset 0 1px 0 rgba(255,255,255,0.1)',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
      }}
    />
  );
}

function FrameSwatch({ preset, isActive, onSelect }: { preset: FramePreset; isActive: boolean; onSelect: () => void }): ReactElement {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      title={preset.name}
      style={{
        flex: 1,
        height: '46px',
        borderRadius: '10px',
        cursor: 'pointer',
        background: 'rgba(10,14,24,0.6)',
        border: preset.border,
        boxShadow: isActive ? `${preset.glow}, 0 0 0 2px rgba(255,255,255,0.4)` : preset.glow,
        transition: 'box-shadow 160ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: '0.05em',
      }}
    >
      {preset.name}
    </div>
  );
}

function AppearancePanel({ currentSkin, username, gold, onSetSkin }: AppearanceActions): ReactElement {
  const [bannerId, setBannerId] = useState<string>(BANNER_PRESETS[0].id);
  const [frameId, setFrameId] = useState<string>(FRAME_PRESETS[0].id);
  const skin = SKINS.find((s) => s.id === currentSkin);
  const banner = getActiveBanner(bannerId);
  const frame = getActiveFrame(frameId);

  return (
    <div>
      <ProfileHeader username={username} gold={gold} skin={skin} banner={banner} frame={frame} />

      <div style={SECTION_HEADER}><span>Apparence</span><span style={{ opacity: 0.5 }}>{SKINS.length}</span></div>
      <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '4px' }}>
        {SKINS.map((s) => (
          <SkinCard key={s.id} skin={s} isActive={s.id === currentSkin} onSelect={() => onSetSkin(s.id)} />
        ))}
      </div>

      <div style={SECTION_HEADER}><span>Bannière</span></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {BANNER_PRESETS.map((p) => (
          <BannerSwatch key={p.id} preset={p} isActive={p.id === bannerId} onSelect={() => setBannerId(p.id)} />
        ))}
      </div>

      <div style={SECTION_HEADER}><span>Cadre</span></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {FRAME_PRESETS.map((p) => (
          <FrameSwatch key={p.id} preset={p} isActive={p.id === frameId} onSelect={() => setFrameId(p.id)} />
        ))}
      </div>
    </div>
  );
}

function RoomCard({ room, isOwn, disabled, onJoin }: { room: RoomEntry; isOwn: boolean; disabled: boolean; onJoin: () => void }): ReactElement {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 14px',
      borderRadius: '10px',
      marginBottom: '8px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{room.p1.username}</div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(room.createdAt).toLocaleTimeString()}</div>
      </div>
      <button
        type="button"
        onClick={onJoin}
        disabled={isOwn || disabled}
        style={{ ...btnPrimary('#22c55e', isOwn || disabled), width: 'auto', padding: '8px 16px', fontSize: '0.8rem', marginTop: 0 }}
      >
        {isOwn ? 'Votre room' : 'Rejoindre'}
      </button>
    </div>
  );
}

function RoomsContent({ loading, rooms, playerId, hasOpenSession, isInQueue, onJoinRoom }: {
  loading: boolean;
  rooms: RoomEntry[];
  playerId: string | undefined;
  hasOpenSession: boolean;
  isInQueue: boolean;
  onJoinRoom: (id: string) => void;
}): ReactElement {
  if (loading) return <p style={FAINT}>Chargement des rooms...</p>;
  if (rooms.length === 0) return <p style={FAINT}>Aucune room ouverte. Créez-en une !</p>;
  return (
    <>
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isOwn={room.player1Id === playerId}
          disabled={hasOpenSession || isInQueue}
          onJoin={() => onJoinRoom(room.id)}
        />
      ))}
    </>
  );
}

function RoomsPanel({ rooms, loading, isWaiting, hasOpenSession, isInQueue, playerId, onCreateRoom, onJoinRoom, onCancelRoom }: RoomsActions): ReactElement {
  const createDisabled = isInQueue || (hasOpenSession && !isWaiting);
  return (
    <div>
      <p style={DESC}>Créez ou rejoignez une room personnalisée.</p>
      <button
        type="button"
        style={btnPrimary('#22c55e', createDisabled)}
        disabled={createDisabled}
        onClick={isWaiting ? onCancelRoom : onCreateRoom}
      >
        🏰 {isWaiting ? 'Annuler ma room' : 'Créer une room'}
      </button>
      <div style={{ marginTop: '16px' }}>
        <RoomsContent
          loading={loading}
          rooms={rooms}
          playerId={playerId}
          hasOpenSession={hasOpenSession}
          isInQueue={isInQueue}
          onJoinRoom={onJoinRoom}
        />
      </div>
    </div>
  );
}
