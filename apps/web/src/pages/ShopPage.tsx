import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';

import type { SeedId } from '@game/shared-types';
import { SEED_CONFIGS } from '@game/shared-types';

import { shopApi } from '../api/shop.api';
import { useAuthStore } from '../store/auth.store';
import { useFarmingStore } from '../store/farming.store';
import { getItemVisualMeta } from '../utils/itemVisual';
import { getSessionPo } from '../utils/sessionPo';
import { useTranslation } from '../store/language.store';
import { useGameSession } from './GameTunnel';
import './ShopPage.css';

type FilterType = 'ALL' | 'WEAPON' | 'ARMOR' | 'OTHER';

interface ShopItem {
  id: string;
  name: string;
  type: string;
  family: string | null;
  shopPrice?: number;
  stats?: Record<string, number>;
  iconPath?: string;
}

export function ShopPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const queryClient = useQueryClient();
  const { player, refreshPlayer } = useAuthStore();
  const { activeSession, refreshSession } = useGameSession();
  const { fetchState, seedId } = useFarmingStore();
  const { t } = useTranslation();

  const { data: items, isLoading } = useQuery({
    queryKey: ['shop-items'],
    queryFn: () => shopApi.getItems(),
  });

  const buyMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      shopApi.buyItem({ itemId, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      void refreshPlayer();
      void refreshSession({ silent: true });
    },
  });

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const seedConfig = seedId ? SEED_CONFIGS[seedId as SeedId] : null;

  const isSeedItem = (family: string | null) => {
    if (!seedConfig || !family) return true;
    return (seedConfig.families as readonly string[]).includes(family);
  };

  const sessionPo = getSessionPo(activeSession, player?.id);
  const spendableGold = activeSession ? (sessionPo ?? 0) : (player?.gold ?? 0);

  const renderStats = (stats?: Record<string, number>) => {
    if (!stats) return null;
    return Object.entries(stats)
      .map(([key, value]) => `+${value} ${key.toUpperCase()}`)
      .join(', ');
  };

  const shopItems = (items?.data || []).filter((item: any) => item.shopPrice != null);

  return (
    <div className="shop-container">
      <header className="shop-wallet-header">
        <div>
          <h1 className="shop-title">💰 {t('shop')}</h1>
          <p className="shop-wallet-hint">{t('currentBalance')}</p>
        </div>
        <div className="shop-wallet-balance">
          <span className="shop-wallet-icon">💰</span>
          <strong>{spendableGold}</strong>
          <span>{t('goldUnit')}</span>
        </div>
      </header>

      <div className="item-filters">
        <div className="filter-group">
          <button className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}>{t('all')}</button>
          <button className={`filter-btn ${activeFilter === 'WEAPON' ? 'active' : ''}`} onClick={() => setActiveFilter('WEAPON')}>⚔️ {t('weapons')}</button>
          <button className={`filter-btn ${activeFilter === 'ARMOR' ? 'active' : ''}`} onClick={() => setActiveFilter('ARMOR')}>🛡️ {t('armors')}</button>
          <button className={`filter-btn ${activeFilter === 'OTHER' ? 'active' : ''}`} onClick={() => setActiveFilter('OTHER')}>🎒 {t('others')}</button>
        </div>
      </div>

      <div className="shop-grid compact">
        {isLoading && <p className="shop-loading">{t('loading')}</p>}
        {shopItems.filter((item: any) => {
          if (activeFilter === 'ALL') return true;
          if (activeFilter === 'WEAPON' && item.type === 'WEAPON') return true;
          if (activeFilter === 'ARMOR' && ['ARMOR_HEAD', 'ARMOR_CHEST', 'ARMOR_LEGS'].includes(item.type)) return true;
          if (activeFilter === 'OTHER' && !['WEAPON', 'ARMOR_HEAD', 'ARMOR_CHEST', 'ARMOR_LEGS'].includes(item.type)) return true;
          return false;
        }).map((item) => {
          const inSeed = isSeedItem(item.family);
          const price = item.shopPrice ?? 0;
          const visual = getItemVisualMeta(item);
          return (
            <div key={item.id} className={`shop-item-card compact ${!inSeed ? 'out-of-seed' : ''}`}>
              <div className="shop-item-visual">
                {visual.iconPath ? (
                  <img src={visual.iconPath} alt={item.name} />
                ) : (
                  <span className="shop-item-emoji">{visual.icon}</span>
                )}
              </div>

              <div className="shop-item-content">
                <div className="shop-item-type">{item.type}</div>
                <h3 className="shop-item-name">{item.name}</h3>
                
                <div className="shop-item-stats-compact">
                  {renderStats(item.statsBonus) || t('noBonus')}
                </div>

                <div className="shop-item-footer">
                  <p className="shop-item-price">💰 {price} {t('goldUnit')}</p>
                  <button
                    type="button"
                    className="shop-buy-button"
                    onClick={() => buyMutation.mutate({ itemId: item.id, quantity: 1 })}
                    disabled={buyMutation.isPending || spendableGold < price}
                  >
                    {buyMutation.isPending ? t('buying') : spendableGold < price ? t('notEnoughGold') : t('buy')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
