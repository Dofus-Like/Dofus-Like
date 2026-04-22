import React from 'react';
import { SKINS } from '../../constants/skins';
import { useAuthStore } from '../../../store/auth.store';
import { HubMenuOverlay } from './HubMenuOverlay';

interface SkinMenuOverlayProps {
  onClose: () => void;
}

export function SkinMenuOverlay({ onClose }: SkinMenuOverlayProps) {
  const player = useAuthStore((s) => s.player);
  const setSkin = useAuthStore((s) => s.setSkin);

  return (
    <HubMenuOverlay title="🎭 Choisissez votre apparence" onClose={onClose}>
      <div className="hub-skins-grid">
        {SKINS.map((skin) => (
          <div
            key={skin.id}
            className={`skin-card ${player?.skin === skin.id ? 'active' : ''}`}
            onClick={() => void setSkin(skin.id)}
          >
            <div className="skin-preview-container">
              <div
                className={`skin-sprite-icon type-${skin.type} avatar-${skin.type === 'soldier' ? 'soldier' : 'orc'}`}
                style={{
                  filter: `hue-rotate(${skin.hue}deg) saturate(${skin.saturation})`,
                  backgroundImage: `url(/assets/sprites/${skin.type}/idle.png)`,
                }}
              />
            </div>
            <div className="skin-info">
              <span className="skin-name">{skin.name}</span>
              <span className="skin-desc">{skin.description}</span>
            </div>
            {player?.skin === skin.id && <div className="skin-current-badge">ACTIF</div>}
          </div>
        ))}
      </div>
    </HubMenuOverlay>
  );
}
