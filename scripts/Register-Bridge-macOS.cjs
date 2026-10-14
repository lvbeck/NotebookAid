const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
if (process.platform !== 'darwin') throw Error('This registration script requires macOS.');
const app = fs.realpathSync(process.argv[2] || '/Applications/NotebookAid.app');
const bridge = path.join(app, 'Contents/Resources/bridge/NotebookAid.Bridge');
if (!fs.statSync(bridge).isFile() || !fs.statSync(path.join(app, 'Contents/MacOS/NotebookAid')).isFile()) throw Error('Invalid application bundle.');
const directory = path.join(os.homedir(), 'Library/Application Support/Mozilla/NativeMessagingHosts');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const names = [['de.zub_systems.notebookaid', 'notebookaid@zub-systems.de'], ['de.zub_systems.notebookaid_t02', 'notebookaid-t02@zub-systems.de']];
for (const [name, id] of names) {
  const target = path.join(directory, name + '.json');
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target); if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Linked registration rejected.');
    const old = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (old.name !== name || old.path !== bridge || !Array.isArray(old.allowed_extensions) || old.allowed_extensions.length !== 1 || old.allowed_extensions[0] !== id) throw Error('Existing registration belongs to another application path.');
  }
}
for (const [name, id] of names) {
  const target = path.join(directory, name + '.json');
  if (process.argv.includes('--remove')) { if (fs.existsSync(target)) fs.unlinkSync(target); continue; }
  const temp = target + '.' + process.pid + '.tmp';
  fs.writeFileSync(temp, JSON.stringify({ name, description: 'NotebookAid bridge', path: bridge, type: 'stdio', allowed_extensions: [id] }), { mode: 0o600, flag: 'wx' });
  fs.renameSync(temp, target);
}
console.log(process.argv.includes('--remove') ? 'NotebookAid bridge registration removed.' : 'NotebookAid bridge registered for the current user.');
