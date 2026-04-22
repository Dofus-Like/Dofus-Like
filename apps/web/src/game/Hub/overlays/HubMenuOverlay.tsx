import React, { useEffect } from 'react';
import './hub-overlays.css';

interface HubMenuOverlayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function HubMenuOverlay({ title, onClose, children }: HubMenuOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="hub-overlay-backdrop" onClick={onClose}>
      <div className="hub-overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hub-overlay-header">
          <h2>{title}</h2>
          <button className="hub-overlay-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="hub-overlay-body">{children}</div>
      </div>
    </div>
  );
}
