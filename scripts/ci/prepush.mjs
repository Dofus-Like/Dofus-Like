import {
  assertSecurityRecoveryState,
  bootApplicationStack,
  buildImages,
  cleanup,
  dirtySecurityFixturePath,
  dumpLogs,
  logStep,
  runCompose,
  runSqlFile,
  waitForApiHealthy,
  waitForApiSetup,
  waitForWeb,
} from './local-prod-lib.mjs';

const prefix = 'ci:prepush';

async function runFreshScenario() {
  logStep('Running fresh database deployment smoke', prefix);
  cleanup({ prefix, volumes: true });
  await bootApplicationStack({ prefix });
  cleanup({ prefix, volumes: true });
}

async function runDirtyUpgradeScenario() {
  logStep('Running dirty upgrade recovery smoke', prefix);
  cleanup({ prefix, volumes: true });
  await bootApplicationStack({ prefix });

  logStep('Injecting duplicate open sessions and replaying the security migration', prefix);
  runSqlFile(dirtySecurityFixturePath);

  runCompose(['rm', '-f', 'api-setup'], { allowFailure: true });
  runCompose(['up', '-d', '--force-recreate', 'api-setup']);
  await waitForApiSetup(180000);

  logStep('Asserting recovery state after rerunning api-setup', prefix);
  assertSecurityRecoveryState();

  runCompose(['up', '-d', '--force-recreate', 'api', 'web']);
  await waitForApiHealthy(180000);
  await waitForWeb(120000);
  cleanup({ prefix, volumes: true });
}

async function main() {
  buildImages({ prefix });
  await runFreshScenario();
  await runDirtyUpgradeScenario();
  logStep('CI smoke passed on fresh and dirty upgrade scenarios', prefix);
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
