-- Recreate a dirty pre-security-migration state on a database that already ran once.
-- This lets ci:prepush validate the recovery path before rerunning api-setup.

DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260322170000_security_hardening_sessions';

DROP INDEX IF EXISTS "GameSession_player1Id_open_key";
DROP INDEX IF EXISTS "GameSession_player2Id_open_key";
DROP INDEX IF EXISTS "CombatSession_player1Id_open_public_key";
DROP INDEX IF EXISTS "CombatSession_player2Id_open_public_key";

DELETE FROM "CombatSession"
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

DELETE FROM "GameSession"
WHERE id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003'
);

DELETE FROM "Player"
WHERE id IN (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000004'
);

INSERT INTO "Player" (
  id,
  username,
  email,
  "passwordHash",
  gold,
  skin
)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'ci-player-1', 'ci-player-1@example.test', 'hash', 100, 'soldier-classic'),
  ('30000000-0000-0000-0000-000000000002', 'ci-player-2', 'ci-player-2@example.test', 'hash', 100, 'soldier-classic'),
  ('30000000-0000-0000-0000-000000000003', 'ci-player-3', 'ci-player-3@example.test', 'hash', 100, 'soldier-classic'),
  ('30000000-0000-0000-0000-000000000004', 'ci-player-4', 'ci-player-4@example.test', 'hash', 100, 'soldier-classic');

INSERT INTO "GameSession" (
  id,
  status,
  phase,
  "player1Id",
  "player2Id",
  "createdAt"
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'WAITING',
    'FARMING',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    TIMESTAMP '2026-01-01 10:00:00'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'ACTIVE',
    'FARMING',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    TIMESTAMP '2026-01-02 10:00:00'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'ACTIVE',
    'FARMING',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    TIMESTAMP '2026-01-03 10:00:00'
  );

INSERT INTO "CombatSession" (
  id,
  status,
  "player1Id",
  "player2Id",
  "gameSessionId",
  "createdAt"
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'WAITING',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    NULL,
    TIMESTAMP '2026-01-01 11:00:00'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'ACTIVE',
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    NULL,
    TIMESTAMP '2026-01-02 11:00:00'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'ACTIVE',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    NULL,
    TIMESTAMP '2026-01-03 11:00:00'
  );
