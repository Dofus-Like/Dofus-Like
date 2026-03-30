const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

function runNode(args, label) {
  const result = spawnSync('node', args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

async function repairDuplicateOpenSessions() {
  const prisma = new PrismaClient();

  try {
    const [gameSessionTable] = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."GameSession"') IS NOT NULL AS ok`,
    );

    if (gameSessionTable && gameSessionTable.ok) {
      await prisma.$executeRawUnsafe(`
        WITH d AS (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY "player1Id" ORDER BY "createdAt" DESC, id DESC) rn
          FROM "GameSession" WHERE status IN ('WAITING', 'ACTIVE')
        )
        UPDATE "GameSession" s SET status = 'FINISHED', "endedAt" = COALESCE(s."endedAt", NOW())
        FROM d WHERE s.id = d.id AND d.rn > 1
      `);

      await prisma.$executeRawUnsafe(`
        WITH d AS (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY "player2Id" ORDER BY "createdAt" DESC, id DESC) rn
          FROM "GameSession"
          WHERE status IN ('WAITING', 'ACTIVE') AND "player2Id" IS NOT NULL
        )
        UPDATE "GameSession" s SET status = 'FINISHED', "endedAt" = COALESCE(s."endedAt", NOW())
        FROM d WHERE s.id = d.id AND d.rn > 1
      `);

      console.log('[repair] GameSession OK');
    }

    const [combatSessionTable] = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."CombatSession"') IS NOT NULL AS ok`,
    );

    if (combatSessionTable && combatSessionTable.ok) {
      await prisma.$executeRawUnsafe(`
        WITH d AS (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY "player1Id" ORDER BY "createdAt" DESC, id DESC) rn
          FROM "CombatSession"
          WHERE status IN ('WAITING', 'ACTIVE') AND "gameSessionId" IS NULL
        )
        UPDATE "CombatSession" s SET status = 'FINISHED', "endedAt" = COALESCE(s."endedAt", NOW())
        FROM d WHERE s.id = d.id AND d.rn > 1
      `);

      await prisma.$executeRawUnsafe(`
        WITH d AS (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY "player2Id" ORDER BY "createdAt" DESC, id DESC) rn
          FROM "CombatSession"
          WHERE status IN ('WAITING', 'ACTIVE') AND "gameSessionId" IS NULL AND "player2Id" IS NOT NULL
        )
        UPDATE "CombatSession" s SET status = 'FINISHED', "endedAt" = COALESCE(s."endedAt", NOW())
        FROM d WHERE s.id = d.id AND d.rn > 1
      `);

      console.log('[repair] CombatSession OK');
    }

    console.log('[repair] All done');
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureSeeded() {
  const prisma = new PrismaClient();

  try {
    const itemCount = await prisma.item.count();
    if (itemCount > 0) {
      console.log(`[seed] DB deja initialisee (${itemCount} items), skip.`);
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('[seed] DB vide, lancement du seed...');
  runNode(['seed-build/prisma/seed.js'], 'seed');
}

async function main() {
  console.log('[startup] Repairing duplicate open sessions before migrations...');
  await repairDuplicateOpenSessions();

  console.log('[startup] Applying Prisma migrations...');
  runNode(
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema=./prisma/schema.prisma'],
    'migrate deploy',
  );

  console.log('[startup] Checking seed...');
  await ensureSeeded();
}

main().catch((error) => {
  console.error('[startup] api-setup failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
