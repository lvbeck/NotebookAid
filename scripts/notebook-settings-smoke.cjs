const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { SettingsStore } = require('../dist/runtime/core/settings');
const { BackupStore } = require('../dist/runtime/core/backups');
const root = path.resolve('output/notebook-settings-ui/' + Date.now()); fs.mkdirSync(root, { recursive: true });
const registry = new LibraryRegistry(root, path.join(root, 'library'));
const a = registry.state().entries[0]; registry.get(); registry.updateNotebookSettings(a.id, { autosave: { enabled: true, minutes: 3 } });
const secondPath = path.join(root, 'second'); const second = new NoteLibrary(secondPath); second.create(randomUUID(), { title: 'Notebook settings fixture', body: 'Local fixture', primaryFormat: 'text' }); second.close();
registry.add(secondPath, 'existing'); const b = registry.state().entries[1]; registry.close();
const settings = new SettingsStore(root, { locale: null, theme: null, autosave: null }); settings.override(b.id, { enabled: true, minutes: 7 });
const backupDirectory = path.join(root, 'local-backups'); new BackupStore(root).update(b.id, backupDirectory, true);
fs.writeFileSync(path.join(root, 'notebook-settings-fixture.json'), JSON.stringify({ a, b, backupDirectory }));
const dev = process.argv.includes('--dev'), exe = dev ? require('electron') : path.resolve('release', require('../package.json').version, 'NotebookAid-win32-x64/NotebookAid.exe');
for (const [arg, report] of [['--self-test', 'notebook-settings-report.json'], ['--self-test-reopen', 'notebook-settings-reopen.json']]) {
  const result = cp.spawnSync(exe, dev ? ['.', arg] : [arg], { windowsHide: true, timeout: 60000, encoding: 'utf8', env: { ...process.env, NOTEBOOKAID_TEST_HOME: root, NOTEBOOKAID_NOTEBOOK_SETTINGS_TEST: '1' } });
  console.log(root, arg, result.status, result.stderr);
  if (result.status !== 0 || !fs.existsSync(path.join(root, report)) || fs.existsSync(path.join(root, 'smoke-error.txt'))) { console.error(fs.existsSync(path.join(root, 'smoke-error.txt')) ? fs.readFileSync(path.join(root, 'smoke-error.txt'), 'utf8') : 'No report'); process.exit(1); }
  console.log(fs.readFileSync(path.join(root, report), 'utf8'));
}
