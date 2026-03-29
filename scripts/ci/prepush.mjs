import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const composeFiles = [
  resolve(repoRoot, 'docker-compose.portainer.yml'),
  resolve(repoRoot, 'docker-compose.ci-local.override.yml'),
];

const composeProjectName = 'dofus-like-ci-local';
const apiImage = process.env.CI_LOCAL_API_IMAGE ?? 'dofus-like-api:ci-local';
const webImage = process.env.CI_LOCAL_WEB_IMAGE ?? 'dofus-like-web:ci-local';
const apiSetupContainerName = 'dofus-like-api-setup-ci-local';
const apiContainerName = 'dofus-like-api-ci-local';
const webContainerName = 'dofus-like-web-ci-local';
const postgresContainerName = 'dofus-like-postgres-ci-local';
const apiPort = process.env.CI_LOCAL_API_PORT ?? '13000';
const webPort = process.env.CI_LOCAL_WEB_PORT ?? '18080';
const dirtySecurityFixturePath = resolve(repoRoot, 'scripts', 'ci', 'fixtures', 'dirty-security-migration-state.sql');

const ciEnv = {
  ...process.env,
  COMPOSE_PROJECT_NAME: composeProjectName,
  IMAGE_TAG: 'ci-local',
  CI_LOCAL_API_IMAGE: apiImage,
  CI_LOCAL_WEB_IMAGE: webImage,
  CI_LOCAL_API_PORT: apiPort,
  CI_LOCAL_WEB_PORT: webPort,
  CI_LOCAL_POSTGRES_PORT: process.env.CI_LOCAL_POSTGRES_PORT ?? '15432',
  CI_LOCAL_REDIS_PORT: process.env.CI_LOCAL_REDIS_PORT ?? '16379',
  JWT_SECRET: process.env.JWT_SECRET ?? 'ci-local-jwt-secret-32-chars-minimum',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? 'ci-local-postgres-password',
};

function run(command, args, options = {}) {
  const { allowFailure = false, capture = false, env = ciEnv, input } = options;
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    input,
  });

  if (result.error) {
    throw result.error;
  }

  if (!allowFailure && result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    const stdout = typeof result.stdout === 'string' ? result.stdout.trim() : '';
    const details = stderr || stdout;
    throw new Error(details || `${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }

  return result;
}

function runCompose(args, options = {}) {
  const composeArgs = ['compose'];
  for (const file of composeFiles) {
    composeArgs.push('-f', file);
  }
  composeArgs.push(...args);
  return run('docker', composeArgs, options);
}

function logStep(message) {
  console.log(`\n[ci:prepush] ${message}`);
}

function cleanup() {
  logStep('Cleaning up local CI stack');
  runCompose(['down', '-v', '--remove-orphans'], { allowFailure: true });
}

function dumpLogs() {
  logStep('Collecting failing service logs');
  runCompose(['logs', '--no-color', 'postgres', 'redis', 'api-setup', 'api', 'web'], { allowFailure: true });
}

async function waitForApiSetup(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const inspection = run(
      'docker',
      ['inspect', '--format', '{{.State.Status}}|{{.State.ExitCode}}', apiSetupContainerName],
      { allowFailure: true, capture: true },
    );

    if (inspection.status === 0) {
      const [status, exitCode] = inspection.stdout.trim().split('|');
      if (status === 'exited' && exitCode === '0') {
        return;
      }
      if (status === 'exited') {
        throw new Error(`api-setup exited with code ${exitCode}`);
      }
    }

    await sleep(2000);
  }

  throw new Error('Timed out waiting for api-setup to finish');
}

async function waitForApiHealthy(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const inspection = run(
      'docker',
      ['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}|{{.State.Status}}', apiContainerName],
      { allowFailure: true, capture: true },
    );

    if (inspection.status === 0) {
      const [healthStatus, stateStatus] = inspection.stdout.trim().split('|');
      if (healthStatus === 'healthy') {
        return;
      }
      if (healthStatus === 'unhealthy' || stateStatus === 'exited') {
        throw new Error(`api container is ${healthStatus} (${stateStatus})`);
      }
    }

    await sleep(3000);
  }

  throw new Error('Timed out waiting for API healthcheck');
}

async function waitForWeb(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const webUrl = `http://127.0.0.1:${webPort}`;

  while (Date.now() < deadline) {
    const state = run(
      'docker',
      ['inspect', '--format', '{{.State.Status}}', webContainerName],
      { allowFailure: true, capture: true },
    );

    if (state.status === 0 && state.stdout.trim() === 'exited') {
      throw new Error('web container exited before becoming reachable');
    }

    try {
      const response = await fetch(webUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore connection errors while nginx is still starting.
    }

    await sleep(2000);
  }

  throw new Error('Timed out waiting for web container');
}

function runPsql(sql, capture = false) {
  return run(
    'docker',
    ['exec', '-i', postgresContainerName, 'psql', '-U', 'game_user', '-d', 'game_db', '-v', 'ON_ERROR_STOP=1'],
    { capture, input: sql },
  );
}

function runSqlFile(filePath) {
  const sql = readFileSync(filePath, 'utf8');
  runPsql(sql);
}

function querySingleValue(sql) {
  const statement = `${sql.trim()}\n`;
  const result = run(
    'docker',
    ['exec', '-i', postgresContainerName, 'psql', '-U', 'game_user', '-d', 'game_db', '-v', 'ON_ERROR_STOP=1', '-t', '-A'],
    { capture: true, input: statement },
  );

  return result.stdout.trim();
}

function assertSecurityRecoveryState() {
  const indexCount = querySingleValue(`
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'GameSession_player1Id_open_key',
        'GameSession_player2Id_open_key',
        'CombatSession_player1Id_open_public_key',
        'CombatSession_player2Id_open_public_key'
      );
  `);

  if (indexCount !== '4') {
    throw new Error(`expected 4 security indexes after recovery, got ${indexCount}`);
  }

  const duplicateCount = querySingleValue(`
    WITH game_player1_dupes AS (
      SELECT COUNT(*) AS duplicate_count
      FROM (
        SELECT "player1Id"
        FROM "GameSession"
        WHERE status IN ('WAITING', 'ACTIVE')
        GROUP BY "player1Id"
        HAVING COUNT(*) > 1
      ) AS duplicates
    ),
    game_player2_dupes AS (
      SELECT COUNT(*) AS duplicate_count
      FROM (
        SELECT "player2Id"
        FROM "GameSession"
        WHERE status IN ('WAITING', 'ACTIVE')
          AND "player2Id" IS NOT NULL
        GROUP BY "player2Id"
        HAVING COUNT(*) > 1
      ) AS duplicates
    ),
    combat_player1_dupes AS (
      SELECT COUNT(*) AS duplicate_count
      FROM (
        SELECT "player1Id"
        FROM "CombatSession"
        WHERE status IN ('WAITING', 'ACTIVE')
          AND "gameSessionId" IS NULL
        GROUP BY "player1Id"
        HAVING COUNT(*) > 1
      ) AS duplicates
    ),
    combat_player2_dupes AS (
      SELECT COUNT(*) AS duplicate_count
      FROM (
        SELECT "player2Id"
        FROM "CombatSession"
        WHERE status IN ('WAITING', 'ACTIVE')
          AND "gameSessionId" IS NULL
          AND "player2Id" IS NOT NULL
        GROUP BY "player2Id"
        HAVING COUNT(*) > 1
      ) AS duplicates
    )
    SELECT
      (
        SELECT duplicate_count FROM game_player1_dupes
      ) + (
        SELECT duplicate_count FROM game_player2_dupes
      ) + (
        SELECT duplicate_count FROM combat_player1_dupes
      ) + (
        SELECT duplicate_count FROM combat_player2_dupes
      );
  `);

  if (duplicateCount !== '0') {
    throw new Error(`expected duplicate open sessions to be repaired, got ${duplicateCount} remaining duplicate groups`);
  }
}

async function bootApplicationStack() {
  logStep('Starting infra and api-setup');
  runCompose(['up', '-d', 'postgres', 'redis', 'api-setup']);

  logStep('Waiting for api-setup completion');
  await waitForApiSetup(180000);

  logStep('Starting API and web');
  runCompose(['up', '-d', 'api', 'web']);

  logStep('Waiting for API healthcheck');
  await waitForApiHealthy(180000);

  logStep('Waiting for web availability');
  await waitForWeb(120000);
}

async function runFreshScenario() {
  logStep('Running fresh database deployment smoke');
  cleanup();
  await bootApplicationStack();
  cleanup();
}

async function runDirtyUpgradeScenario() {
  logStep('Running dirty upgrade recovery smoke');
  cleanup();
  await bootApplicationStack();

  logStep('Injecting duplicate open sessions and replaying the security migration');
  runSqlFile(dirtySecurityFixturePath);

  runCompose(['rm', '-f', 'api-setup'], { allowFailure: true });
  runCompose(['up', '-d', '--force-recreate', 'api-setup']);
  await waitForApiSetup(180000);

  logStep('Asserting recovery state after rerunning api-setup');
  assertSecurityRecoveryState();

  runCompose(['up', '-d', '--force-recreate', 'api', 'web']);
  await waitForApiHealthy(180000);
  await waitForWeb(120000);
  cleanup();
}

async function main() {
  logStep('Checking Docker availability');
  run('docker', ['version', '--format', '{{.Server.Version}}']);
  run('docker', ['compose', 'version']);

  logStep('Building API image');
  run('docker', ['build', '--progress', 'plain', '-f', 'apps/api/Dockerfile', '-t', apiImage, '.']);

  logStep('Building Web image');
  run('docker', ['build', '--progress', 'plain', '-f', 'apps/web/Dockerfile', '--build-arg', 'VITE_API_URL=/api/v1', '-t', webImage, '.']);

  await runFreshScenario();
  await runDirtyUpgradeScenario();

  logStep('CI smoke passed on fresh and dirty upgrade scenarios');
}

main()
  .catch((error) => {
    console.error(`\n[ci:prepush] ${error instanceof Error ? error.message : String(error)}`);
    dumpLogs();
    process.exitCode = 1;
  })
  .finally(() => {
    cleanup();
  });
