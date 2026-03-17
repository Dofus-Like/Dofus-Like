import { PrismaClient, ItemType, SpellType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Nettoyage (ordre inverse des clés étrangères)
  await prisma.combatTurn.deleteMany();
  await prisma.combatSession.deleteMany();
  await prisma.playerSpell.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.playerStats.deleteMany();
  await prisma.player.deleteMany();
  await prisma.item.deleteMany();
  await prisma.spell.deleteMany();

  // ── Ressources ──────────────────────────────────────────────────

  const fer = await prisma.item.create({
    data: { name: 'Fer', type: 'RESOURCE' },
  });
  const cuir = await prisma.item.create({
    data: { name: 'Cuir', type: 'RESOURCE' },
  });
  const cristal = await prisma.item.create({
    data: { name: 'Cristal magique', type: 'RESOURCE' },
  });
  const etoffe = await prisma.item.create({
    data: { name: 'Étoffe', type: 'RESOURCE' },
  });
  const bois = await prisma.item.create({
    data: { name: 'Bois', type: 'RESOURCE' },
  });
  const herbe = await prisma.item.create({
    data: { name: 'Herbe médicinale', type: 'RESOURCE' },
  });
  const or = await prisma.item.create({
    data: { name: 'Or', type: 'RESOURCE' },
  });

  // ── Armes (craft 3u → shop 4 Or) ───────────────────────────────

  await prisma.item.create({
    data: {
      name: 'Épée',
      type: 'WEAPON',
      statsBonus: { attaque: 5 },
      craftCost: { [fer.id]: 2, [cuir.id]: 1 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Bouclier',
      type: 'WEAPON',
      statsBonus: { defense: 5 },
      craftCost: { [fer.id]: 3 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Bâton magique',
      type: 'WEAPON',
      statsBonus: { magie: 5 },
      craftCost: { [cristal.id]: 2, [etoffe.id]: 1 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Grimoire',
      type: 'WEAPON',
      statsBonus: { magie: 3, resistanceMagique: 2 },
      craftCost: { [cristal.id]: 3 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Kunaï',
      type: 'WEAPON',
      statsBonus: { attaque: 3, initiative: 2 },
      craftCost: { [fer.id]: 2, [cuir.id]: 1 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Bombe ninja',
      type: 'WEAPON',
      statsBonus: { attaque: 2, initiative: 3 },
      craftCost: { [herbe.id]: 2, [bois.id]: 1 },
      shopPrice: 4,
    },
  });

  // ── Armures tête (craft 2u → shop 3 Or) ─────────────────────────

  await prisma.item.create({
    data: {
      name: 'Heaume',
      type: 'ARMOR',
      statsBonus: { defense: 3 },
      craftCost: { [fer.id]: 2 },
      shopPrice: 3,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Chapeau de mage',
      type: 'ARMOR',
      statsBonus: { resistanceMagique: 3 },
      craftCost: { [cristal.id]: 1, [etoffe.id]: 1 },
      shopPrice: 3,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Bandeau',
      type: 'ARMOR',
      statsBonus: { initiative: 3 },
      craftCost: { [cuir.id]: 2 },
      shopPrice: 3,
    },
  });

  // ── Armures torse (craft 3u → shop 4 Or) ────────────────────────

  await prisma.item.create({
    data: {
      name: 'Armure',
      type: 'ARMOR',
      statsBonus: { defense: 5 },
      craftCost: { [fer.id]: 2, [cuir.id]: 1 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Toge de mage',
      type: 'ARMOR',
      statsBonus: { resistanceMagique: 5 },
      craftCost: { [etoffe.id]: 3 },
      shopPrice: 4,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Kimono',
      type: 'ARMOR',
      statsBonus: { initiative: 3, pointsMouvement: 1 },
      craftCost: { [bois.id]: 2, [cuir.id]: 1 },
      shopPrice: 4,
    },
  });

  // ── Armures jambes (craft 2u → shop 3 Or) ───────────────────────

  await prisma.item.create({
    data: {
      name: 'Bottes de fer',
      type: 'ARMOR',
      statsBonus: { defense: 2, pointsMouvement: 1 },
      craftCost: { [fer.id]: 1, [cuir.id]: 1 },
      shopPrice: 3,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Bottes de mage',
      type: 'ARMOR',
      statsBonus: { resistanceMagique: 2, pointsMouvement: 1 },
      craftCost: { [cristal.id]: 1, [etoffe.id]: 1 },
      shopPrice: 3,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Geta',
      type: 'ARMOR',
      statsBonus: { pointsMouvement: 2 },
      craftCost: { [bois.id]: 2 },
      shopPrice: 3,
    },
  });

  // ── Anneaux (craft 4u: 2 res + 2 Or → shop 5 Or) ───────────────

  await prisma.item.create({
    data: {
      name: 'Anneau du Guerrier',
      type: 'RING',
      statsBonus: { defense: 3, pointsMouvement: 1 },
      craftCost: { [fer.id]: 2, [or.id]: 2 },
      shopPrice: 5,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Anneau du Mage',
      type: 'RING',
      statsBonus: { magie: 3, pointsAction: 1 },
      craftCost: { [cristal.id]: 2, [or.id]: 2 },
      shopPrice: 5,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Anneau du Ninja',
      type: 'RING',
      statsBonus: { initiative: 3, pointsMouvement: 1 },
      craftCost: { [cuir.id]: 2, [or.id]: 2 },
      shopPrice: 5,
    },
  });

  // ── Consommables (craft 2u → shop 3 Or) ─────────────────────────

  await prisma.item.create({
    data: {
      name: 'Potion de Soin',
      type: 'CONSUMABLE',
      statsBonus: { healVit: 30 },
      craftCost: { [herbe.id]: 2 },
      shopPrice: 3,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Potion de Force',
      type: 'CONSUMABLE',
      statsBonus: { buffAttaque: 5, buffDuree: 3 },
      craftCost: { [herbe.id]: 1, [cristal.id]: 1 },
      shopPrice: 3,
    },
  });

  await prisma.item.create({
    data: {
      name: 'Potion de Vitesse',
      type: 'CONSUMABLE',
      statsBonus: { buffPM: 2, buffDuree: 2 },
      craftCost: { [herbe.id]: 1, [cuir.id]: 1 },
      shopPrice: 3,
    },
  });

  // ── Joueurs de test ──────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('password123', 10);

  const player1 = await prisma.player.create({
    data: {
      username: 'Warrior',
      email: 'warrior@test.com',
      passwordHash,
      gold: 100,
      stats: {
        create: {
          baseHp: 100,
          baseAp: 6,
          baseMp: 3,
          strength: 10,
          agility: 10,
          initiative: 10,
        },
      },
    },
  });

  const player2 = await prisma.player.create({
    data: {
      username: 'Mage',
      email: 'mage@test.com',
      passwordHash,
      gold: 100,
      stats: {
        create: {
          baseHp: 100,
          baseAp: 6,
          baseMp: 3,
          strength: 10,
          agility: 10,
          initiative: 10,
        },
      },
    },
  });

  const itemCount = await prisma.item.count();
  console.log('✅ Seed completed!');
  console.log(`   Items: ${itemCount} (7 resources + 6 weapons + 9 armors + 3 rings + 3 consumables)`);
  console.log(`   Players: ${player1.username}, ${player2.username} (100 or each)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
