const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const windowsOnly = new Set(['identity-migration.test.cjs', 'installer.test.cjs', 'native-open.test.cjs', 'portable-bridge.test.cjs']);
const files = fs.readdirSync('test').filter(file => file.endsWith('.test.cjs') && (process.platform === 'win32' || !windowsOnly.has(file))).sort().map(file => path.join('test', file));
const result = cp.spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
