const { spawn, spawnSync } = require('node:child_process');
const { mkdirSync, readFileSync, existsSync } = require('node:fs');
const { resolve, join } = require('node:path');

const packaged = process.argv.includes('--packaged');
const executable = packaged ? resolve('release', require('../package.json').version, 'NotebookAid-win32-x64/NotebookAid.exe') : require('electron');
const dataPath = resolve('output', packaged ? 'smoke-packaged' : 'smoke-development', String(Date.now()));
mkdirSync(dataPath, { recursive: true });
const args = packaged ? ['--self-test'] : ['.', '--self-test'];
const child = spawn(executable, args, { windowsHide: true, env: { ...process.env, NOTEBOOKAID_TEST_HOME: dataPath }, stdio: 'pipe' });
child.stderr.on('data', value => process.stderr.write(value));
child.on('error', error => { console.error(error); process.exitCode = 1; });
const timer = setTimeout(() => { child.kill(); console.error('Smoke test timed out'); process.exitCode = 1; }, 90000);
child.on('exit', code => {
  clearTimeout(timer);
  const reportPath = join(dataPath, 'smoke-report.json');
  if (code !== 0 || !existsSync(reportPath)) {
    console.error('Smoke test failed:', code, existsSync(join(dataPath, 'smoke-error.txt')) ? readFileSync(join(dataPath, 'smoke-error.txt'), 'utf8') : 'No report');
    process.exitCode = 1;
    return;
  }
  console.log(readFileSync(reportPath, 'utf8'));
  const reopened = spawnSync(executable, packaged ? ['--self-test-reopen'] : ['.', '--self-test-reopen'], { windowsHide: true, timeout: 30000, encoding: 'utf8', env: { ...process.env, NOTEBOOKAID_TEST_HOME: dataPath } });
  const reopenPath = join(dataPath, 'reopen-report.json');
  if (reopened.status !== 0 || !existsSync(reopenPath)) { console.error('Process restart check failed:', reopened.stderr); process.exitCode = 1; }
  else console.log(readFileSync(reopenPath, 'utf8'));
  console.log('Artifacts:', dataPath);
});
