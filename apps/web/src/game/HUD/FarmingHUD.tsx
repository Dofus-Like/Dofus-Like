import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useFarmingStore } from '../../store/farming.store';
import { useTranslation } from '../../store/language.store';
import './FarmingHUD.css';

export function FarmingHUD() {
  const { pips, round, endPhase } = useFarmingStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleEndPhase = async () => {
    await endPhase();
    // Redirect to the shop as placeholder for transition
    navigate('/shop');
  };

  return (
    <div className="farming-hud">
      <div className="hud-top">
        <span className="round-badge">{t('round', { round })}</span>
      </div>
      <div className="hud-center">
        <div className="pips-container">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`pip ${i < pips ? 'filled' : 'empty'}`} />
          ))}
        </div>
        <div className="pips-label">{t('remainingHarvests', { count: pips })}</div>
      </div>
      <div className="hud-bottom">
        <button className="end-phase-btn" onClick={handleEndPhase}>
          {t('goShopCrafting')}
        </button>
      </div>
    </div>
  );
}
