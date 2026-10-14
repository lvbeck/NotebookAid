const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { once } = require('node:events');
if (process.platform !== 'darwin') throw Error('This packaged smoke test requires macOS.');
const arch = process.argv[2] || process.arch;
const app = path.resolve('release', require('../package.json').version, `NotebookAid-darwin-${arch}/NotebookAid.app`);
const executable = path.join(app, 'Contents/MacOS/NotebookAid');
const root = path.resolve('output/macos-smoke', arch), home = path.join(root,'ui'); fs.mkdirSync(home, { recursive: true });
fs.writeFileSync(path.join(home,'backups.json'),JSON.stringify({version:1,policies:{'00000000-0000-0000-0000-000000000000':{directory:path.join(home,'backup-fixture'),enabled:true,nextAt:1,lastAt:null}}}));
const env = { ...process.env, NOTEBOOKAID_TEST_HOME: home, NOTEBOOKAID_UI_TEST:'1' }; delete env.ELECTRON_RUN_AS_NODE;
async function run(args, environment = env) {
  const child = cp.spawn(executable, args, { env: environment, stdio: ['ignore','pipe','pipe'] });
  let log = ''; child.stdout.on('data', bytes => { log += bytes; }); child.stderr.on('data', bytes => { log += bytes; });
  const timer = setTimeout(() => child.kill('SIGTERM'), 180000);
  try { const [code] = await once(child, 'exit'); fs.writeFileSync(path.join(environment.NOTEBOOKAID_TEST_HOME, args[0] + '.log'), log); if (code !== 0) throw Error('macOS application smoke failed: ' + log.slice(-3000)); }
  finally { clearTimeout(timer); }
}
(async () => {
  cp.execFileSync('codesign', ['--verify','--deep','--strict',app]);
  const binary = cp.execFileSync('lipo', ['-archs',executable], { encoding:'utf8' }).trim();
  if (binary !== arch) throw Error('Package architecture mismatch: ' + binary);
  await run(['--self-test']);
  if (!fs.existsSync(path.join(home, 'ui-report.json'))) throw Error('Missing UI smoke report');
  await run(['--self-test-reopen']);
  if (!fs.existsSync(path.join(home, 'ui-reopen.json'))) throw Error('Missing restart smoke report');
  const editor = path.join(root, 'editor'); fs.mkdirSync(editor,{recursive:true});
  await run(['--self-test'], {...env, NOTEBOOKAID_TEST_HOME:editor, NOTEBOOKAID_UI_TEST:'0', NOTEBOOKAID_EDITOR_TEST:'1'});
  if (!fs.existsSync(path.join(editor, 'editor-report.json'))) throw Error('Missing editor smoke report');
  fs.writeFileSync(path.join(root,'macos-verification.json'),JSON.stringify({arch,adHocSignatureVerified:true,editor:true,restart:true}));
})().catch(error => { console.error(error); process.exitCode=1; });
