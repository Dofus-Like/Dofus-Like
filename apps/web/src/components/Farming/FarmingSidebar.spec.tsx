import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FarmingSidebar } from './FarmingSidebar';

const allItems = [
  { id: 'fer-id', name: 'Fer', type: 'RESOURCE', iconPath: '/fer.png' },
  { id: 'cuir-id', name: 'Cuir', type: 'RESOURCE', iconPath: '/cuir.png' },
  { id: 'or-id', name: 'Or', type: 'RESOURCE', iconPath: '/or.png' },
];

const forgeItems = [
  {
    id: 'epee-id',
    name: 'Epee craftable',
    type: 'WEAPON',
    craftCost: { 'fer-id': 2 },
    statsBonus: { atk: 5 },
    iconPath: '/epee.png',
  },
  {
    id: 'anneau-id',
    name: 'Anneau trop cher',
    type: 'ACCESSORY',
    craftCost: { 'fer-id': 2, 'or-id': 2 },
    statsBonus: { atk: 10 },
    iconPath: '/anneau.png',
  },
  {
    id: 'bottes-id',
    name: 'Bottes avec ressource nommee',
    type: 'ARMOR_LEGS',
    craftCost: { 'cuir-id': 1 },
    statsBonus: { pm: 1 },
    iconPath: '/bottes.png',
  },
];

describe('FarmingSidebar', () => {
  it('filtre les recettes craftables avec les ressources possedees', () => {
    render(
      <FarmingSidebar
        inventory={[{ itemId: 'fer-id', quantity: 2, item: allItems[0] }]}
        forgeItems={forgeItems}
        shopItems={[]}
        allItems={allItems}
        equipment={{}}
        resources={{ Cuir: 1 }}
        spendableGold={0}
        onEquip={vi.fn()}
        onUnequip={vi.fn()}
        onCraft={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Forge/i }));
    expect(screen.getByText('Epee craftable')).toBeInTheDocument();
    expect(screen.getByText('Anneau trop cher')).toBeInTheDocument();
    expect(screen.getByText('Bottes avec ressource nommee')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /OK/i }));

    expect(screen.getByText('Epee craftable')).toBeInTheDocument();
    expect(screen.getByText('Bottes avec ressource nommee')).toBeInTheDocument();
    expect(screen.queryByText('Anneau trop cher')).not.toBeInTheDocument();
  });

  it('affiche la balance et tous les prix dans la boutique', () => {
    const shopItems = Array.from({ length: 18 }, (_, index) => ({
      id: `shop-${index}`,
      name: `Item boutique ${index}`,
      type: index % 2 === 0 ? 'WEAPON' : 'ACCESSORY',
      shopPrice: 10 + index,
      iconPath: `/shop-${index}.png`,
    }));

    render(
      <FarmingSidebar
        inventory={[]}
        forgeItems={[]}
        shopItems={shopItems}
        allItems={allItems}
        equipment={{}}
        resources={{}}
        spendableGold={42}
        onEquip={vi.fn()}
        onUnequip={vi.fn()}
        onCraft={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Boutique/i }));

    expect(screen.getByText('Solde actuel')).toBeInTheDocument();
    expect(screen.getByText('💰 42')).toBeInTheDocument();
    expect(screen.getByAltText('Item boutique 17')).toBeInTheDocument();
    expect(screen.getByText('💰 27 Po')).toBeInTheDocument();
  });
});
