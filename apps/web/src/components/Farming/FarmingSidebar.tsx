import React, { useState, useEffect } from 'react';
import { InventoryGrid } from './InventoryGrid';
import { ForgeList } from './ForgeList';
import { Mannequin } from './Mannequin';
import { ItemDetail } from './ItemDetail';
import './FarmingSidebar.css';

interface FarmingSidebarProps {
  inventory: any[];
  forgeItems: any[];
  shopItems: any[];
  allItems?: any[];
  equipment: any;
  resources: Record<string, number>;
  onEquip: (item: any) => void;
  onUnequip: (slot: any) => void;
  onCraft: (item: any) => void;
  onBuy: (item: any) => void;
}

export const FarmingSidebar = ({ 
  inventory = [], 
  forgeItems = [], 
  shopItems = [],
  allItems = [],
  equipment = {}, 
  resources = {},
  onEquip,
  onUnequip,
  onCraft,
  onBuy
}: FarmingSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'forge' | 'boutique'>('inventory');
  const [bottomMode, setBottomMode] = useState<'mannequin' | 'detail'>('mannequin');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WEAPON' | 'ARMOR' | 'ACCESSORY'>('ALL');
  const [craftableFilter, setCraftableFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');

  // Handle drag start event from document (triggered by InventoryGrid)
  useEffect(() => {
    const handleDragStart = () => setBottomMode('mannequin');
    document.addEventListener('item-drag-start', handleDragStart);
    return () => document.removeEventListener('item-drag-start', handleDragStart);
  }, []);

  const handleItemHover = (item: any | null) => {
    if (item) {
      setSelectedItem(item);
      setBottomMode('detail');
    } else {
      setBottomMode('mannequin');
    }
  };

  const handleAction = (action: (item: any) => void, item: any) => {
    action(item);
    setBottomMode('mannequin');
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setBottomMode('detail');
  };

  return (
    <aside className="farming-sidebar">
      <div className="sidebar-section section-top">
        <header className="sidebar-header">
          <button 
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            🎒 Sac
          </button>
          <button 
            className={`tab-btn ${activeTab === 'forge' ? 'active' : ''}`}
            onClick={() => setActiveTab('forge')}
          >
            🔨 Forge
          </button>
          <button 
            className={`tab-btn ${activeTab === 'boutique' ? 'active' : ''}`}
            onClick={() => setActiveTab('boutique')}
          >
            💰 Shop
          </button>
        </header>

        <div className="filter-bar">
          <div className="filter-group">
            <button className={`filter-btn ${typeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setTypeFilter('ALL')}>Tous</button>
            <button className={`filter-btn ${typeFilter === 'WEAPON' ? 'active' : ''}`} onClick={() => setTypeFilter('WEAPON')}>Armes</button>
            <button className={`filter-btn ${typeFilter === 'ARMOR' ? 'active' : ''}`} onClick={() => setTypeFilter('ARMOR')}>Armures</button>
            <button className={`filter-btn ${typeFilter === 'ACCESSORY' ? 'active' : ''}`} onClick={() => setTypeFilter('ACCESSORY')}>Acc.</button>
          </div>
          {activeTab === 'forge' && (
            <div className="filter-group">
              <button className={`filter-btn ${craftableFilter === 'YES' ? 'active' : ''}`} onClick={() => setCraftableFilter(craftableFilter === 'YES' ? 'ALL' : 'YES')}>🔨 OK</button>
            </div>
          )}
        </div>
        
        <div className="sidebar-content">
          {(() => {
            const filterItem = (it: any) => {
              const type = it.type || it.item?.type;
              if (typeFilter === 'WEAPON' && type !== 'WEAPON') return false;
              if (typeFilter === 'ARMOR' && !['ARMOR_HEAD', 'ARMOR_CHEST', 'ARMOR_LEGS'].includes(type)) return false;
              if (typeFilter === 'ACCESSORY' && type !== 'ACCESSORY') return false;
              
              if (activeTab === 'forge' && craftableFilter === 'YES') {
                const costs = it.craftCost || {};
                const canCraft = Object.entries(costs).every(([resId, qty]) => (resources[resId] || 0) >= (qty as number));
                if (!canCraft) return false;
              }
              return true;
            };

            if (activeTab === 'inventory') {
              return (
                <InventoryGrid 
                  items={inventory.filter(filterItem)} 
                  onItemHover={handleItemHover}
                  onItemClick={handleItemClick}
                  onItemDoubleClick={(item) => handleAction(onEquip, item)}
                />
              );
            }
            if (activeTab === 'forge') {
              return (
                <ForgeList 
                  items={forgeItems.filter(filterItem)} 
                  allItems={allItems}
                  onItemHover={handleItemHover}
                  onItemClick={handleItemClick}
                  onItemDoubleClick={(item) => handleAction(onCraft, item)}
                />
              );
            }
            if (activeTab === 'boutique') {
              return (
                <InventoryGrid 
                  items={shopItems.filter(filterItem)} 
                  onItemHover={handleItemHover}
                  onItemClick={handleItemClick}
                  onItemDoubleClick={(item) => handleAction(onBuy, item)}
                />
              );
            }
          })()}
        </div>
      </div>

      <div className="sidebar-section section-bottom">
        <div className="sidebar-content-bottom">
          {bottomMode === 'mannequin' ? (
            <Mannequin 
              equipment={equipment} 
              onUnequip={(slot) => handleAction(onUnequip, slot)} 
            />
          ) : (
            <ItemDetail item={selectedItem} />
          )}
        </div>
      </div>
    </aside>
  );
};
