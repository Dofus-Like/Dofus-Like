import {
  bootApplicationStack,
  buildImages,
  cleanup,
  dumpLogs,
  fetchJson,
  getApiUrl,
  logStep,
  login,
} from './local-prod-lib.mjs';

const prefix = 'smoke:prod-local';

async function loginAndResolvePlayer(email) {
  const token = await login(email, 'password123');
  const me = await fetchJson('/auth/me', { token });
  return { token, me };
}

async function main() {
  cleanup({ prefix, volumes: true });
  buildImages({ prefix });
  await bootApplicationStack({ prefix });

  const warrior = await loginAndResolvePlayer('warrior@test.com');
  const mage = await loginAndResolvePlayer('mage@test.com');

  logStep('Checking private room flow', prefix);
  const waitingRoom = await fetchJson('/game-session/create-private', {
    method: 'POST',
    token: warrior.token,
  });

  await fetchJson('/game-session/join/' + waitingRoom.id, {
    method: 'POST',
    token: mage.token,
  });

  await fetchJson('/game-session/end/' + waitingRoom.id, {
    method: 'POST',
    token: warrior.token,
  });

  logStep('Checking matchmaking queue flow', prefix);
  const joinWarrior = await fetchJson('/game-session/join-queue', {
    method: 'POST',
    token: warrior.token,
  });
  if (joinWarrior.status !== 'searching') {
    throw new Error(`unexpected warrior queue status: ${joinWarrior.status}`);
  }

  const joinMage = await fetchJson('/game-session/join-queue', {
    method: 'POST',
    token: mage.token,
  });
  if (joinMage.status !== 'matched' || typeof joinMage.sessionId !== 'string') {
    throw new Error(`unexpected mage queue status: ${joinMage.status}`);
  }

  const activeWarrior = await fetchJson('/game-session/active', {
    token: warrior.token,
  });
  if (!activeWarrior || activeWarrior.status !== 'ACTIVE') {
    throw new Error('warrior did not recover an active session after matchmaking');
  }

  await fetchJson('/game-session/end/' + activeWarrior.id, {
    method: 'POST',
    token: warrior.token,
  });

  logStep(`Smoke passed on ${getApiUrl()}`, prefix);
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
