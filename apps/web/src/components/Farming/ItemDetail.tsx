import React from 'react';
import { useTranslation } from '../../store/language.store';
import './ItemDetail.css';

interface ItemDetailProps {
  item: any;
}

export const ItemDetail = ({ item }: ItemDetailProps) => {
  const { t } = useTranslation();
  if (!item) return <div className="item-detail-empty">{t('selectItem')}</div>;

  return (
    <div className="item-detail-card">
      <div className="item-detail-header">
        <div className="item-type-badge">LVL {item.level || 1}</div>
        <h3>{item.name}</h3>
      </div>
      
      <div className="item-detail-visual">
        <img src={item.iconPath} alt={item.name} className="detail-icon" />
      </div>

      <div className="item-detail-stats">
        <div className="stat-row">
          <span className="stat-label">{t('associatedSpell')}</span>
          <span className="stat-value">{item.spell?.name || t('unknown')}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">{t('damage')}</span>
          <span className="stat-value">{item.stats?.damage || '5-9'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">{t('range')}</span>
          <span className="stat-value">{item.stats?.range || '1 PO'}</span>
        </div>
      </div>

      {item.recipe && (
        <div className="item-detail-recipe">
          <span className="recipe-title">{t('forgeCost')}</span>
          <div className="recipe-grid">
            {Object.entries(item.recipe).map(([res, count]) => (
              <div key={res} className="recipe-item">
                <span className="res-name">{res}</span>
                <span className="res-count">x{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
