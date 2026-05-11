import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpellEffectKind, SpellFamily } from '@game/shared-types';
import { SpellBar, type SpellBarItem } from './SpellBar';

const spells: SpellBarItem[] = [
  {
    id: 'spell-a',
    name: 'Claque',
    paCost: 2,
    family: SpellFamily.COMMON,
    sortOrder: 1,
    effectKind: SpellEffectKind.DAMAGE_PHYSICAL,
  },
  {
    id: 'spell-z',
    name: 'Boule de Feu',
    paCost: 3,
    family: SpellFamily.COMMON,
    sortOrder: 2,
    effectKind: SpellEffectKind.DAMAGE_MAGICAL,
  },
];

describe('SpellBar', () => {
  it('selectionne les sorts avec les touches AZERTYUIOP', () => {
    const onSpellClick = vi.fn();
    render(<SpellBar spells={spells} onSpellClick={onSpellClick} />);

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'z' });

    expect(onSpellClick).toHaveBeenNthCalledWith(1, 'spell-a');
    expect(onSpellClick).toHaveBeenNthCalledWith(2, 'spell-z');
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('ignore le raccourci si le sort est indisponible', () => {
    const onSpellClick = vi.fn();
    render(<SpellBar spells={spells} onSpellClick={onSpellClick} remainingPa={1} />);

    fireEvent.keyDown(window, { key: 'a' });

    expect(onSpellClick).not.toHaveBeenCalled();
  });
});
