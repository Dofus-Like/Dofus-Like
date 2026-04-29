import type { CSSProperties, ReactElement } from 'react';

interface HubOnboardingHintProps {
  visible: boolean;
  onDismiss: () => void;
  onGoVsAi?: () => void;
}

const STYLE_TAG_ID = 'hub-onboarding-hint-styles';
const HINT_STYLES = `
@keyframes hub-onboarding-enter {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
.hub-onboarding-card {
  animation: hub-onboarding-enter 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.hub-onboarding-card::before {
  content: '';
  position: absolute;
  top: 0; left: 18px; right: 18px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(56,189,248,0.5), rgba(129,140,248,0.5), transparent);
  pointer-events: none;
  border-radius: 0;
}
.hub-onboarding-cta {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; margin-top: 14px;
  padding: 12px 20px;
  border: none; border-radius: 12px; cursor: pointer; overflow: hidden;
  font-family: inherit; font-size: 0.84rem; font-weight: 700; letter-spacing: 0.015em;
  color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
  box-shadow: 0 4px 18px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.2);
  transition: filter 160ms ease, transform 160ms ease, box-shadow 200ms ease;
}
.hub-onboarding-cta::before {
  content: '';
  position: absolute; inset: 1px; border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 55%);
  pointer-events: none;
}
.hub-onboarding-cta:hover {
  filter: brightness(1.1) saturate(1.08);
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(99,102,241,0.52), 0 2px 10px rgba(56,189,248,0.32), inset 0 1px 0 rgba(255,255,255,0.24);
}
.hub-onboarding-cta:active { transform: translateY(0); filter: brightness(0.95); }
.hub-onboarding-dismiss:hover { color: rgba(255,255,255,0.82) !important; }
.hub-onboarding-cta:focus-visible, .hub-onboarding-dismiss:focus-visible {
  outline: 2px solid rgba(99,102,241,0.72);
  outline-offset: 3px;
}
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.textContent = HINT_STYLES;
  document.head.appendChild(tag);
}

const OUTER: CSSProperties = {
  position: 'absolute',
  bottom: '32px',
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  pointerEvents: 'none',
  zIndex: 10,
  padding: '0 16px',
};

const CARD: CSSProperties = {
  position: 'relative',
  width: '400px',
  maxWidth: '100%',
  background: 'linear-gradient(180deg, rgba(11,15,28,0.97) 0%, rgba(7,11,21,0.97) 100%)',
  backdropFilter: 'blur(20px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
  border: '1px solid rgba(99,102,241,0.28)',
  boxShadow: '0 0 0 1px rgba(56,189,248,0.05), 0 24px 60px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.04)',
  borderRadius: '18px',
  padding: '18px 22px 20px',
  pointerEvents: 'auto',
  color: 'white',
  fontFamily: 'system-ui, sans-serif',
};

const GUIDE_BADGE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '2px 9px',
  borderRadius: '999px',
  border: '1px solid rgba(56,189,248,0.32)',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(56,189,248,0.82)',
  background: 'rgba(56,189,248,0.06)',
  marginBottom: '10px',
};

const DOT: CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: 'rgba(56,189,248,0.72)',
  flexShrink: 0,
};

const TITLE: CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 800,
  color: '#f1f5f9',
  margin: '0 0 0',
  letterSpacing: '-0.02em',
  textShadow: '0 0 24px rgba(99,102,241,0.45)',
};

const DIVIDER: CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, rgba(99,102,241,0.35), rgba(56,189,248,0.2), rgba(99,102,241,0.35))',
  margin: '10px 0 12px',
};

const BODY: CSSProperties = {
  fontSize: '0.82rem',
  color: 'rgba(255,255,255,0.55)',
  lineHeight: 1.6,
  margin: 0,
};

const DISMISS_BTN: CSSProperties = {
  display: 'block',
  margin: '9px auto 0',
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.38)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.74rem',
  fontWeight: 500,
  padding: '4px 10px',
  transition: 'color 150ms ease',
};

function CardCorner(): ReactElement {
  return (
    <svg
      aria-hidden
      width="26"
      height="26"
      viewBox="0 0 52 52"
      fill="none"
      style={{ position: 'absolute', top: 10, left: 12, opacity: 0.32, pointerEvents: 'none' }}
    >
      <path d="M3 49V13C3 7.477 7.477 3 13 3H49" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9 43V15C9 11.686 11.686 9 15 9H43" stroke="#818cf8" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function HubOnboardingHint({ visible, onDismiss, onGoVsAi }: HubOnboardingHintProps): ReactElement | null {
  ensureStyles();
  if (!visible) return null;

  return (
    <div style={OUTER}>
      <div className="hub-onboarding-card" style={CARD} role="region" aria-label="Guide de démarrage">
        <CardCorner />
        <div style={GUIDE_BADGE}>
          <span aria-hidden style={DOT} />
          Guide
        </div>
        <h3 style={TITLE}>Première aventure</h3>
        <div aria-hidden style={DIVIDER} />
        <p style={BODY}>Lance un combat contre l'IA pour découvrir les bases.</p>
        {onGoVsAi && (
          <button type="button" className="hub-onboarding-cta" onClick={onGoVsAi} aria-label="Commencer avec VS AI">
            <span aria-hidden>◈</span>
            Commencer avec VS AI
          </button>
        )}
        <button
          type="button"
          className="hub-onboarding-dismiss"
          style={DISMISS_BTN}
          onClick={onDismiss}
          aria-label="Plus tard, fermer le guide"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
