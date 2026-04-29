import type { CSSProperties, ReactElement } from 'react';

export type Hub3DLoaderState = 'loading' | 'slow' | 'error' | 'done';

const ANIM_ID = 'hub3d-loader-anim';
const ANIM_CSS =
  '@keyframes _hub3d_spin{to{transform:rotate(360deg)}}.hub3d-loader-ring{animation:_hub3d_spin 900ms linear infinite}';

function ensureLoaderAnim(): void {
  if (typeof document === 'undefined' || document.getElementById(ANIM_ID)) return;
  const el = document.createElement('style');
  el.id = ANIM_ID;
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

function getMessage(state: Hub3DLoaderState): string {
  if (state === 'slow') return 'Chargement plus long que prévu…';
  if (state === 'error') return 'Erreur de chargement du royaume';
  return 'Chargement du royaume…';
}

function getTextStyle(state: Hub3DLoaderState): CSSProperties {
  if (state === 'slow') return SLOW_TEXT;
  if (state === 'error') return ERROR_TEXT;
  return TEXT;
}

const WRAPPER: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 100,
  background: '#07101f',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none',
  transition: 'opacity 400ms ease',
};

const RING: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.07)',
  borderTopColor: 'rgba(96,140,220,0.9)',
};

const TEXT: CSSProperties = {
  color: 'rgba(255,255,255,0.78)',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  textShadow: '0 0 24px rgba(96,140,220,0.55)',
};

const SLOW_TEXT: CSSProperties = {
  ...TEXT,
  color: 'rgba(255,200,100,0.85)',
  textShadow: '0 0 24px rgba(255,180,60,0.4)',
  fontSize: 13,
};

const ERROR_TEXT: CSSProperties = {
  ...TEXT,
  color: 'rgba(239,68,68,0.85)',
  textShadow: '0 0 24px rgba(239,68,68,0.4)',
};

const RETRY_BTN: CSSProperties = {
  marginTop: 4,
  padding: '7px 20px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.75)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  cursor: 'pointer',
};

interface Hub3DLoaderProps {
  state: Hub3DLoaderState;
}

export function Hub3DLoader({ state }: Hub3DLoaderProps): ReactElement {
  ensureLoaderAnim();
  const visible = state !== 'done';
  return (
    <div
      aria-hidden={!visible}
      style={{ ...WRAPPER, opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      {state !== 'error' && <div className="hub3d-loader-ring" style={RING} />}
      <span style={getTextStyle(state)}>{getMessage(state)}</span>
      {(state === 'slow' || state === 'error') && (
        <button type="button" style={RETRY_BTN} onClick={() => window.location.reload()}>
          Réessayer
        </button>
      )}
    </div>
  );
}
