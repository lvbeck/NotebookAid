const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve('output/editor-packaged/' + Date.now());
fs.mkdirSync(root, { recursive: true });
const dev = process.argv.includes('--dev');
const exe = dev ? require('electron') : path.resolve('release', require('../package.json').version, 'NotebookAid-win32-x64/NotebookAid.exe');
const result = cp.spawnSync(exe, dev ? ['.', '--self-test'] : ['--self-test'], {
  windowsHide: true, timeout: 90000, encoding: 'utf8',
  env: { ...process.env, NOTEBOOKAID_TEST_HOME: root, NOTEBOOKAID_EDITOR_TEST: '1' }
});
console.log(root, result.status, result.stderr);
const error = path.join(root, 'smoke-error.txt'), report = path.join(root, 'source-table-report.json');
if (result.status !== 0 || fs.existsSync(error) || !fs.existsSync(report) || !fs.existsSync(path.join(root, 'editor-report.json'))) {
  console.error(fs.existsSync(error) ? fs.readFileSync(error, 'utf8') : 'No report'); process.exit(1);
}
console.log(fs.readFileSync(report, 'utf8'));
console.log(fs.readFileSync(path.join(root, 'markdown-presentation-report.json'), 'utf8'));
