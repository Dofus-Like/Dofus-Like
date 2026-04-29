import type { CSSProperties, ReactElement } from 'react';

const SKY_URL = '/backgrounds/hub-sky.png';

const STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#07101f',
  backgroundImage: [
    'linear-gradient(rgba(5, 8, 18, 0.35), rgba(5, 8, 18, 0.65))',
    `url('${SKY_URL}')`,
    'radial-gradient(circle at 50% 45%, rgba(80,140,255,0.22), transparent 40%)',
  ].join(', '),
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

export function HubBackdrop(): ReactElement {
  return <div aria-hidden style={STYLE} />;
}
