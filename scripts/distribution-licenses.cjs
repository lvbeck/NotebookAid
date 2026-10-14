const fs = require('node:fs'), path = require('node:path');
function distributionLicenses(packageRoot, stage) {
  const records = [], texts = [];
  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const folder = path.join(directory, item.name);
      if (item.name.startsWith('@')) { visit(folder); continue; }
      const file = path.join(folder, 'package.json');
      if (!fs.existsSync(file)) continue;
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      const notices = fs.readdirSync(folder).filter(name => /^(license|licence|copying|notice)(\.|$)/i.test(name) && fs.statSync(path.join(folder, name)).isFile());
      if (!notices.length && manifest.name === 'lazy-val' && manifest.version === '1.0.5' && manifest.license === 'MIT') {
        notices.push('package.json'); texts.push(fs.readFileSync('docs/third-party/lazy-val-MIT.txt', 'utf8'));
      }
      if (!notices.length) throw Error('Missing distributed dependency license: ' + manifest.name);
      records.push({ name: manifest.name, version: manifest.version, license: manifest.license, notices });
      for (const name of notices) texts.push(`\n===== ${manifest.name} ${manifest.version}: ${name} =====\n${fs.readFileSync(path.join(folder, name), 'utf8')}`);
      if (fs.existsSync(path.join(folder, 'node_modules'))) visit(path.join(folder, 'node_modules'));
    }
  }
  visit(path.join(stage, 'node_modules'));
  fs.writeFileSync(path.join(packageRoot, 'runtime-THIRD-PARTY-LICENSES.txt'), texts.join('\n'));
  fs.writeFileSync(path.join(packageRoot, 'distribution-dependencies.json'), JSON.stringify({ schemaVersion: 1, runtime: records, rendererNotice: 'renderer-THIRD-PARTY-LICENSES.txt', electronNotice: ['LICENSE', 'LICENSES.chromium.html'], projectNotice: 'NotebookAid-LICENSE.txt' }, null, 2));
}
module.exports = { distributionLicenses };
