import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactElement } from 'react';

import { useHubStore } from '../../store/hub.store';

const PANEL: CSSProperties = {
  position: 'absolute',
  left: 16,
  bottom: 16,
  width: 480,
  maxWidth: 'calc(100vw - 32px)',
  background: 'rgba(7, 16, 31, 0.78)',
  border: '1px solid rgba(212, 169, 106, 0.28)',
  borderRadius: 10,
  padding: 8,
  zIndex: 80,
  fontFamily: 'system-ui, sans-serif',
  color: '#f4e9d6',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  backdropFilter: 'blur(6px)',
};

const LOG: CSSProperties = {
  height: 168,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  padding: '4px 6px',
  background: 'rgba(0, 0, 0, 0.18)',
  borderRadius: 6,
};

const LINE: CSSProperties = { lineHeight: 1.35, wordBreak: 'break-word' };
const AUTHOR: CSSProperties = { color: '#d4a96a', fontWeight: 600, marginRight: 6 };

const FORM: CSSProperties = { display: 'flex', gap: 6 };
const INPUT: CSSProperties = {
  flex: 1,
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#f4e9d6',
  padding: '6px 8px',
  borderRadius: 6,
  fontSize: 12,
  outline: 'none',
};
const SEND: CSSProperties = {
  background: 'rgba(212, 169, 106, 0.85)',
  border: 'none',
  color: '#1a1a1a',
  fontWeight: 700,
  padding: '6px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
};

const MAX_LEN = 280;

function getPlaceholder(status: 'idle' | 'connecting' | 'connected' | 'error'): string {
  if (status === 'connected') return 'Parler au hub…';
  if (status === 'error') return 'Hors-ligne — relance l\'API';
  return 'Connexion…';
}

export function HubChatPanel(): ReactElement | null {
  const status = useHubStore((state) => state.status);
  const messages = useHubStore((state) => state.chat);
  const sendChat = useHubStore((state) => state.sendChat);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (status === 'idle') return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    void sendChat(trimmed);
    setDraft('');
  };

  const placeholder = getPlaceholder(status);

  return (
    <div style={PANEL}>
      <div ref={logRef} style={LOG}>
        {messages.length === 0 ? (
          <div style={{ opacity: 0.55, fontStyle: 'italic' }}>Aucun message pour le moment.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={LINE}>
              <span style={AUTHOR}>{m.username}</span>
              <span>{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form style={FORM} onSubmit={handleSubmit}>
        <input
          style={INPUT}
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          placeholder={placeholder}
          disabled={status !== 'connected'}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" style={SEND} disabled={status !== 'connected' || !draft.trim()}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
