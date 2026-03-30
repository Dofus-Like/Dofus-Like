import { cleanup } from './local-prod-lib.mjs';

const prefix = 'stack:prod-local:down';
const removeVolumes = process.env.CI_LOCAL_REMOVE_VOLUMES === '1';

try {
  cleanup({ prefix, volumes: removeVolumes });
} catch (error) {
  console.error(`\n[${prefix}] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
