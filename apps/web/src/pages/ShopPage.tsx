import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';

import type { SeedId } from '@game/shared-types';
import { SEED_CONFIGS } from '@game/shared-types';

import { shopApi } from '../api/shop.api';
import { useAuthStore } from '../store/auth.store';
import { useFarmingStore } from '../store/farming.store';
import { useTranslation } from '../store/language.store';
import { getItemVisualMeta } from '../utils/itemVisual';
import { getSessionPo } from '../utils/sessionPo';
import { useGameSession } from './GameTunnel';

import './ShopPage.css';

type FilterType = 'ALL' | 'WEAPON' | 'ARMOR' | 'OTHER';

interface ShopItem {
  id: string;
  name: string;
  type: string;
  family: string | null;
  shopPrice?: number;
  statsBonus?: Record<string, number>;
  iconPath?: string;
}

export function ShopPage(): React.ReactNode {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const queryClient = useQueryClient();
  const { player, refreshPlayer } = useAuthStore();
  const { activeSession, refreshSession } = useGameSession();
  const { t } = useTranslation();
  const fetchState = useFarmingStore((s: any) => s.fetchState);

  const items = useQuery({
    queryKey: ['shop-items'],
    queryFn: () => shopApi.getItems(),
  });

  const buyMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      shopApi.buyItem({ itemId, quantity }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['shop-items'] }),
        fetchState(),
        refreshPlayer(),
        refreshSession({ silent: true }),
      ]);
    },
  });

  useEffect(() => {
    if (activeSession) {
      void refreshSession({ silent: true });
    }
  }, [activeSession, refreshSession]);

  const spendableGold = activeSession 
    ? (getSessionPo(activeSession, player?.id) ?? 0) 
    : (player?.gold ?? 0);

  const handleBuy = (itemId: string): void => {
    buyMutation.mutate({ itemId, quantity: 1 });
  };

  const isSeedItem = (family: string | null): boolean => {
    if (!family) return true;
    return true; 
  };

  const renderStats = (stats: Record<string, number> | undefined): string | null => {
    if (!stats) return null;
    return Object.entries(stats)
      .map(([key, value]) => `+${value} ${key.toUpperCase()}`)
      .join(', ');
  };

  const shopItems = (items?.data || []).filter((item: ShopItem) => item.shopPrice != null);

  return (
    <div className="shop-container">
      <header className="shop-wallet-header">
        <div>
          <h1 className="shop-title">💰 {t('shop')}</h1>
          <p className="shop-wallet-hint">{t('currentBalance')}</p>
        </div>
        <div className="shop-wallet-balance">
          <span className="gold-amount">{spendableGold.toLocaleString()}</span>
          <span className="gold-icon">🪙</span>
        </div>
      </header>

      <nav className="shop-filters">
        {(['ALL', 'WEAPON', 'ARMOR', 'OTHER'] as const).map((f) => (
          <button
            key={f}
            className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {t(f.toLowerCase() as any)}
          </button>
        ))}
      </nav>

      <div className="shop-grid compact">
        {items.isLoading && <p className="shop-loading">{t('loading')}</p>}
        {shopItems.filter((item: ShopItem) => {
          if (activeFilter === 'ALL') return true;
          if (activeFilter === 'WEAPON' && item.type === 'WEAPON') return true;
          if (activeFilter === 'ARMOR' && ['ARMOR_HEAD', 'ARMOR_CHEST', 'ARMOR_LEGS'].includes(item.type)) return true;
          if (activeFilter === 'OTHER' && !['WEAPON', 'ARMOR_HEAD', 'ARMOR_CHEST', 'ARMOR_LEGS'].includes(item.type)) return true;
          return false;
        }).map((item: ShopItem) => {
          const inSeed = isSeedItem(item.family);
          const price = item.shopPrice ?? 0;
          const visual = getItemVisualMeta(item as unknown as { iconPath?: string; type: string });
          return (
            <div key={item.id} className={`shop-item-card compact ${!inSeed ? 'out-of-seed' : ''}`}>
              <div className="shop-item-visual">
                {visual.iconPath ? (
                  <img src={visual.iconPath} alt={item.name} className="item-icon-img" />
                ) : (
                  <span className="item-icon-emoji">{visual.icon}</span>
                )}
              </div>

              <div className="shop-item-content">
                <div className="shop-item-type">{item.type}</div>
                <h3 className="shop-item-name">{item.name}</h3>
                
                <div className="shop-item-stats-compact">
                  {renderStats(item.statsBonus) || t('noBonus')}
                </div>

                <div className="shop-item-footer">
                  <div className="item-price">
                    <span className="price-val">{price}</span>
                    <span className="price-unit">🪙</span>
                  </div>
                  <button
                    className="buy-btn-sm"
                    disabled={spendableGold < price || buyMutation.isPending}
                    onClick={() => handleBuy(item.id)}
                  >
                    {(() => { 
                      if (buyMutation.isPending) return t('buying'); 
                      if (spendableGold < price) return t('notEnoughGold'); 
                      return t('buy'); 
                    })()}
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
