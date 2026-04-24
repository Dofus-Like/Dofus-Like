import React from 'react';
import './InventoryGrid.css';

interface InventoryGridProps {
  items: any[];
  onItemHover: (item: any | null) => void;
  onItemClick: (item: any) => void;
  onItemDoubleClick: (item: any) => void;
}

export const InventoryGrid = ({ items = [], onItemHover, onItemClick, onItemDoubleClick }: InventoryGridProps) => {
  // Create 12 slots (4x3 or similar)
  const slots = Array(15).fill(null);
  items.forEach((item, index) => {
    if (index < slots.length) slots[index] = item;
  });

  return (
    <div className="inventory-grid-container">
      <div className="inventory-grid">
        {slots.map((item, index) => (
          <div 
            key={`slot-${index}`}
            className={`inventory-slot ${item ? 'has-item' : 'empty'}`}
            onMouseEnter={() => onItemHover(item)}
            onMouseLeave={() => onItemHover(null)}
            onClick={() => item && onItemClick(item)}
            onDoubleClick={() => item && onItemDoubleClick(item)}
            draggable={!!item}
            onDragStart={(e) => {
              if (item) {
                e.dataTransfer.setData('item', JSON.stringify(item));
                // Notify parent that drag started
                document.dispatchEvent(new CustomEvent('item-drag-start'));
              }
            }}
          >
            {item && (
              <>
                <img src={item.iconPath} alt={item.name} className="item-icon" />
                {item.quantity > 1 && (
                  <span className="item-quantity">x{item.quantity}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
