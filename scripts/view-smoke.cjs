const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve('output/view-ui', String(Date.now())); fs.mkdirSync(root, { recursive: true });
const packaged = process.argv.includes('--packaged');
const exe = packaged ? path.resolve('release', require('../package.json').version, 'NotebookAid-win32-x64/NotebookAid.exe') : require('electron');
for (const [argument, report] of [['--self-test', 'view-report.json'], ['--self-test-reopen', 'view-reopen.json']]) {
  const result = cp.spawnSync(exe, packaged ? [argument] : ['.', argument], { windowsHide: true, timeout: 180000, encoding: 'utf8', env: { ...process.env, NOTEBOOKAID_TEST_HOME: root, NOTEBOOKAID_VIEW_TEST: '1' } });
  console.log(root, argument, result.status, result.stderr);
  if (result.status !== 0 || !fs.existsSync(path.join(root, report))) { console.error(fs.existsSync(path.join(root, 'smoke-error.txt')) ? fs.readFileSync(path.join(root, 'smoke-error.txt'), 'utf8') : 'No report'); process.exit(1); }
  console.log(fs.readFileSync(path.join(root, report), 'utf8'));
}
