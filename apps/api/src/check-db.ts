/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkItems(): Promise<void> {
  console.log('--- Checking Resources in DB ---');
  const items = await prisma.item.findMany();
  for (const it of items) {
    console.log(`ID: ${it.id} | Name: ${it.name} | IconPath: ${it.iconPath} | Type: ${it.type}`);
  }

  console.log('\n--- Checking Craftable Items & Recipes ---');
  const craftables = items.filter(it => it.craftCost !== null);
  for (const it of craftables) {
    console.log(`Item: ${it.name} | Recipe: ${JSON.stringify(it.craftCost)}`);
  }
}

checkItems()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());