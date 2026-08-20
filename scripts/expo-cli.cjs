const { spawnSync } = require('node:child_process');

const expoCli = require.resolve('expo/bin/cli');
const result = spawnSync(process.execPath, [expoCli, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    EXPO_NO_TELEMETRY: '1',
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
