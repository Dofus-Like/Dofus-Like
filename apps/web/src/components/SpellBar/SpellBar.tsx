import React from 'react';

import { SpellFamily, SpellEffectKind, PlayerStats } from '@game/shared-types';
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
  description?: string | null;
  iconPath?: string | null;
  paCost: number;
  family: SpellFamily;
  sortOrder: number;
  cooldown?: number;
  damage?: { min: number; max: number };
  effectKind?: SpellEffectKind;
  minRange?: number;
  maxRange?: number;
}

interface SpellBarProps {
  spells: SpellBarItem[];
  selectedSpellId?: string | null;
  onSpellClick: (id: string) => void;
  attackerStats?: PlayerStats;
  targetStats?: PlayerStats;
  remainingPa?: number;
  isMyTurn?: boolean;
  showMannequins?: boolean;
  onToggleMannequins?: () => void;
  onPassTurn?: () => void;
  canPassTurn?: boolean;
  passLabel?: string;
  isReadyMode?: boolean;
  isReady?: boolean;
  disableGrimoire?: boolean;
}

const SpellTooltip = ({ 
  spell, 
  attackerStats, 
  targetStats 
}: { 
  spell: SpellBarItem; 
  attackerStats?: PlayerStats; 
  targetStats?: PlayerStats;
}) => {
  const isMagical = spell.effectKind === SpellEffectKind.DAMAGE_MAGICAL;
  const isHeal = spell.effectKind === SpellEffectKind.HEAL;
  const isDamage = spell.effectKind === SpellEffectKind.DAMAGE_PHYSICAL || isMagical;

  let calculationText = '';
  let resultText = '';
  let typeLabel = '';

  if (attackerStats) {
    if (isDamage && spell.damage) {
      const power = isMagical ? attackerStats.mag : attackerStats.atk;
      const defense = isMagical ? (targetStats?.res ?? 0) : (targetStats?.def ?? 0);
      
      const minRaw = spell.damage.min + power;
      const maxRaw = spell.damage.max + power;
      
      const minTotal = Math.max(1, minRaw - defense);
      const maxTotal = Math.max(1, maxRaw - defense);

      calculationText = `(${spell.damage.min}~${spell.damage.max} + ${power}) - ${defense}`;
      resultText = `${minTotal}~${maxTotal}`;
      typeLabel = isMagical ? 'Dégâts Magiques' : 'Dégâts Physiques';
    } else if (isHeal && spell.damage) {
      const power = Math.floor(attackerStats.mag * 0.5);
      const minHeal = spell.damage.min + power;
      const maxHeal = spell.damage.max + power;

      calculationText = `(${spell.damage.min}~${spell.damage.max} + ${power})`;
      resultText = `${minHeal}~${maxHeal}`;
      typeLabel = 'Soins';
    }
  }

  return (
    <div className="spell-tooltip glass">
      <div className="tooltip-header">
        <div className="tooltip-title">{spell.name}</div>
        <div className="tooltip-cost">{spell.paCost} PA</div>
      </div>
      
      {spell.description && <div className="tooltip-description">{spell.description}</div>}
      
      {resultText && (
        <div className="tooltip-calc-section">
          <div className="tooltip-calc-row">
            <span className="calc-label">{typeLabel}</span>
            <span className="calc-result">{resultText}</span>
          </div>
          <div className="tooltip-formula">{calculationText}</div>
        </div>
      )}

      <div className="tooltip-footer">
        {spell.minRange !== undefined && (
          <div className="tooltip-range">Portée: {spell.minRange}-{spell.maxRange}</div>
        )}
        {spell.cooldown !== undefined && spell.cooldown > 0 && (
          <div className="tooltip-cooldown">Relance: {spell.cooldown} tr.</div>
        )}
      </div>
    </div>
  );
};

export const SpellBar = ({
  spells,
  selectedSpellId,
  onSpellClick,
  attackerStats,
  targetStats,
  remainingPa = 999,
  isMyTurn = true,
  showMannequins = false,
  onToggleMannequins,
  onPassTurn,
  canPassTurn = true,
  passLabel = 'Passer',
  isReadyMode = false,
  isReady = false,
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
              <SpellTooltip 
                spell={spell} 
                attackerStats={attackerStats} 
                targetStats={targetStats} 
              />
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
        className={`spell-bar-action pass ${((isMyTurn && canPassTurn) || isReadyMode) ? 'ready' : ''} ${isReady ? 'is-ready' : ''}`}
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
