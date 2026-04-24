import React from 'react';
import mannequinBg from '../../assets/mannequin-bg.gif';
import './Mannequin.css';

interface EquipmentSlotProps {
  type: string;
  label: string;
  item?: any;
  onDoubleClick?: () => void;
}

const EquipmentSlot = ({ type, label, item, onDoubleClick }: EquipmentSlotProps) => (
  <div 
    className={`equipment-slot slot-${type} ${item ? 'has-item' : 'empty'}`}
    onDoubleClick={onDoubleClick}
  >
    <div className="slot-label-bg">{label}</div>
    {item && (
      <img src={item.iconPath} alt={item.name} className="slot-icon" />
    )}
  </div>
);

export const Mannequin = ({ 
  equipment = {}, 
  onUnequip 
}: { 
  equipment?: any;
  onUnequip?: (slot: any) => void;
}) => {
  const [bgZoom] = React.useState(167);

  return (
    <div className="mannequin-container">
      {/* Background Knight Silhouette */}
      <div 
        className="knight-silhouette-bg" 
        style={{ 
          backgroundImage: `url(${mannequinBg})`,
          width: `${bgZoom}%`,
          height: `${bgZoom}%`
        }} 
      />

      <div className="mannequin-grid-exact">
        {/* Row 1: Head */}
        <div className="grid-row row-head">
          <EquipmentSlot 
            type="head" 
            label="Tête" 
            item={equipment.head} 
            onDoubleClick={() => onUnequip?.('ARMOR_HEAD')}
          />
        </div>

        {/* Row 2: Hands and Chest */}
        <div className="grid-row row-middle">
          <EquipmentSlot 
            type="weapon" 
            label="Main Gauche" 
            item={equipment.weaponLeft} 
            onDoubleClick={() => onUnequip?.('WEAPON_LEFT')}
          />
          <EquipmentSlot 
            type="chest" 
            label="Torse" 
            item={equipment.chest} 
            onDoubleClick={() => onUnequip?.('ARMOR_CHEST')}
          />
          <EquipmentSlot 
            type="weapon2" 
            label="Main Droite" 
            item={equipment.weaponRight} 
            onDoubleClick={() => onUnequip?.('WEAPON_RIGHT')}
          />
        </div>

        {/* Row 3: Legs */}
        <div className="grid-row row-legs">
          <EquipmentSlot 
            type="feet" 
            label="Jambes" 
            item={equipment.feet} 
            onDoubleClick={() => onUnequip?.('ARMOR_LEGS')}
          />
        </div>

        {/* Row 4: Accessory */}
        <div className="grid-row row-accessory">
          <EquipmentSlot 
            type="accessory" 
            label="Accessoire" 
            item={equipment.ring1 || equipment.amulet} 
            onDoubleClick={() => onUnequip?.('ACCESSORY')}
          />
        </div>
      </div>
    </div>
  );
};
