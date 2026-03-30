import {
  bootApplicationStack,
  buildImages,
  cleanup,
  dumpLogs,
  fetchJson,
  getApiUrl,
  logStep,
  login,
  redisContainerName,
  run,
} from './local-prod-lib.mjs';

const prefix = 'repro:matchmaking:legacy-redis';

async function loginAndResolvePlayer(email) {
  const token = await login(email, 'password123');
  const me = await fetchJson('/auth/me', { token });
  return { token, me };
}

function redisCli(args, capture = false) {
  return run('docker', ['exec', '-i', redisContainerName, 'redis-cli', ...args], { capture });
}

async function main() {
  cleanup({ prefix, volumes: true });
  buildImages({ prefix });
  await bootApplicationStack({ prefix });

  const warrior = await loginAndResolvePlayer('warrior@test.com');
  const mage = await loginAndResolvePlayer('mage@test.com');

  logStep('Injecting legacy string queue into Redis', prefix);
  redisCli(['SET', 'matchmaking:queue', JSON.stringify([warrior.me.id])]);

  logStep('Triggering room creation to verify auto-repair', prefix);
  const createdRoom = await fetchJson('/game-session/create-private', {
    method: 'POST',
    token: mage.token,
  });

  const queueType = redisCli(['TYPE', 'matchmaking:queue'], true).stdout.trim();
  if (queueType !== 'zset') {
    throw new Error(`expected matchmaking:queue to become zset, got ${queueType}`);
  }

  const queueStatus = await fetchJson('/game-session/queue-status', {
    token: warrior.token,
  });
  if (queueStatus.queued !== true) {
    throw new Error('legacy queued player was not preserved after migration');
  }

  await fetchJson('/game-session/leave-queue', {
    method: 'POST',
    token: warrior.token,
  });

  await fetchJson('/game-session/end/' + createdRoom.id, {
    method: 'POST',
    token: mage.token,
  });

  logStep(`Legacy Redis repro passed on ${getApiUrl()}`, prefix);
}

main()
  .catch((error) => {
    console.error(`\n[${prefix}] ${error instanceof Error ? error.message : String(error)}`);
    dumpLogs({ prefix });
    process.exitCode = 1;
  })
  .finally(() => {
    cleanup({ prefix, volumes: true });
  });
