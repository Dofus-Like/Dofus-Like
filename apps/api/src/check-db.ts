import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkItems() {
  console.log('--- Checking Resources in DB ---');
  const items = await prisma.item.findMany();
  items.forEach(it => {
    console.log(`ID: ${it.id} | Name: ${it.name} | IconPath: ${it.iconPath} | Type: ${it.type}`);
  });

  console.log('\n--- Checking Craftable Items & Recipes ---');
  const craftables = items.filter(it => it.craftCost !== null);
  craftables.forEach(it => {
    console.log(`Item: ${it.name} | Recipe: ${JSON.stringify(it.craftCost)}`);
  });
}

checkItems()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
