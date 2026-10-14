const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { LibraryRegistry } = require('../dist/runtime/core/registry.js');
const root = path.resolve('output/startup-packaged/' + Date.now()); fs.mkdirSync(root, { recursive: true });
const dev = process.argv.includes('--dev'), exe = dev ? require('electron') : path.resolve('release', require('../package.json').version, 'NotebookAid-win32-x64/NotebookAid.exe');
async function prepare(mode) {
  const home = path.join(root, mode); fs.mkdirSync(home, { recursive: true });
  const directory = path.join(home, 'library');
  if (mode === 'normal') fs.cpSync(path.resolve('output/startup-benchmark/library'), directory, { recursive: true });
  let library = new NoteLibrary(directory); let expected = { mode };
  try {
    if (mode === 'normal') {
      const notes = library.list(), note = notes.at(-1), session = library.begin(note.id, 'startup'); library.end(session.token, session.generation, 'startup');
      expected = { mode, noteId: note.id, title: note.title, count: notes.length };
    }
    if (mode === 'locked') { const note = library.create(randomUUID(), { primaryFormat: 'text', title: 'Private startup fixture', body: 'Private body' }).note; await library.securityCommand({ action: 'setup', password: 'Startup fixture password' }); library.protect(note.id, note.version, true); }
  } finally { library.close(); }
  const registry = new LibraryRegistry(home, directory); registry.close();
  fs.writeFileSync(path.join(home, 'startup-expected.json'), JSON.stringify(expected));
  return home;
}
function launch(home, mode, reopen = false) {
  const result = cp.spawnSync(exe, dev ? ['.', reopen ? '--self-test-reopen' : '--self-test'] : [reopen ? '--self-test-reopen' : '--self-test'], { windowsHide: true, timeout: 180000, env: { ...process.env, NOTEBOOKAID_TEST_HOME: home, NOTEBOOKAID_STARTUP_TEST: '1' }, encoding: 'utf8' });
  const report = path.join(home, 'startup-report-' + mode + '.json');
  console.log(mode, result.status, result.stderr);
  if (result.status !== 0 || !fs.existsSync(report)) throw new Error(fs.existsSync(path.join(home, 'smoke-error.txt')) ? fs.readFileSync(path.join(home, 'smoke-error.txt'), 'utf8') : 'Missing startup report');
  console.log(fs.readFileSync(report, 'utf8'));
}
(async () => {
  const normal = await prepare('normal'); launch(normal, 'normal'); launch(normal, 'normal', true);
  for (const mode of ['empty', 'locked']) launch(await prepare(mode), mode);
  fs.writeFileSync(path.join(normal, 'startup-expected.json'), JSON.stringify({ mode: 'missing' }));
  fs.renameSync(path.join(normal, 'library'), path.join(normal, 'library-offline'));
  try { launch(normal, 'missing'); } finally { fs.renameSync(path.join(normal, 'library-offline'), path.join(normal, 'library')); }
  console.log(root);
})().catch(error => { console.error(error); process.exitCode = 1; });
