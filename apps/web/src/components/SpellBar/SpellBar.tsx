import React from 'react';
import { SpellFamily } from '@game/shared-types';
import './SpellBar.css';

const SPELL_FAMILY_ORDER: Record<SpellFamily, number> = {
  [SpellFamily.COMMON]: 1,
  [SpellFamily.WARRIOR]: 2,
  [SpellFamily.MAGE]: 3,
  [SpellFamily.NINJA]: 4,
};

function toFamilyClassName(family: SpellFamily | null | undefined) {
  return `family-${(family ?? SpellFamily.COMMON).toLowerCase()}`;
}

export interface SpellBarItem {
  id: string;
  name: string;
  iconPath?: string | null;
  paCost: number;
  family: SpellFamily;
  sortOrder: number;
  cooldown?: number;
}

interface SpellBarProps {
  spells: SpellBarItem[];
  selectedSpellId?: string | null;
  onSpellClick: (id: string) => void;
  remainingPa?: number;
  isMyTurn?: boolean;
  showMannequins?: boolean;
  onToggleMannequins?: () => void;
  onPassTurn?: () => void;
  canPassTurn?: boolean;
  passLabel?: string;
  isReadyMode?: boolean;
  disableGrimoire?: boolean;
}

export const SpellBar = ({
  spells,
  selectedSpellId,
  onSpellClick,
  remainingPa = 999,
  isMyTurn = true,
  showMannequins = false,
  onToggleMannequins,
  onPassTurn,
  canPassTurn = true,
  passLabel = 'Passer',
  isReadyMode = false,
  disableGrimoire = false,
}: SpellBarProps) => {
  const [hoveredSpellId, setHoveredSpellId] = React.useState<string | null>(null);

  const sortedSpells = [...spells].sort((a, b) => {
    const familyOrder = SPELL_FAMILY_ORDER[a.family] - SPELL_FAMILY_ORDER[b.family];
    if (familyOrder !== 0) return familyOrder;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="spell-bar glass">
      {sortedSpells.map((spell, index) => {
        const onCooldown = (spell.cooldown ?? 0) > 0;
        const notEnoughPa = remainingPa < spell.paCost;
        const isActive = selectedSpellId === spell.id;
        const disabled = !isMyTurn || onCooldown || notEnoughPa;
        const familyClassName = toFamilyClassName(spell.family);
        const isHovered = hoveredSpellId === spell.id;

        return (
          <div
            key={spell.id}
            className={`spell-card ${disabled ? 'disabled' : ''} ${isActive ? 'active' : ''} ${familyClassName}`}
            onMouseEnter={() => setHoveredSpellId(spell.id)}
            onMouseLeave={() => setHoveredSpellId(null)}
            onClick={() => !disabled && onSpellClick(isActive ? '' : spell.id)}
          >
            {isHovered && (
              <div className="spell-hover-tag">{spell.name}</div>
            )}

            <span className="spell-index-badge">{index + 1}</span>
            <span className="spell-pa-cost">{spell.paCost}</span>

            <img
              src={spell.iconPath || '/assets/pack/spells/epee.png'}
              className="spell-icon-img"
              alt={spell.name}
            />
            <span className="spell-name">{spell.name}</span>
            {onCooldown && (
              <div className="spell-cooldown-overlay">
                <span className="spell-cooldown-value">{spell.cooldown}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Separator */}
      <div className="spell-bar-separator" />

      {/* Grimoire / Equipment toggle */}
      <button
        type="button"
        className={`spell-bar-action grimoire ${showMannequins ? 'active' : ''}`}
        onClick={onToggleMannequins}
        disabled={disableGrimoire}
        title={disableGrimoire ? 'Grimoire indisponible' : 'Grimoire / Équipement'}
      >
        📖
      </button>

      {/* Passer = End turn or Ready button */}
      <button
        type="button"
        className={`spell-bar-action pass ${((isMyTurn && canPassTurn) || isReadyMode) ? 'ready' : ''} ${isReadyMode && passLabel.includes('✓') ? 'is-ready' : ''}`}
        disabled={(!isMyTurn || !canPassTurn) && !isReadyMode}
        onClick={onPassTurn}
        title={isReadyMode ? 'Prêt' : 'Terminer le tour'}
      >
        <span className="pass-icon">{isReadyMode ? '✓' : '⏭'}</span>
        <span className="pass-label">{passLabel}</span>
      </button>
    </div>
  );
};
