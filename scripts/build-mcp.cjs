const fs = require('node:fs'), path = require('node:path');
async function buildMcp() {
  require('./build-mcp-crypt.cjs').buildMcpCrypt();
  const output = path.resolve('dist/mcp'); fs.mkdirSync(output, { recursive: true });
  const result = await require('esbuild').build({ entryPoints: ['mcp/server.cjs'], outfile: path.join(output, 'server.cjs'), bundle: true, platform: 'node', target: 'node24', format: 'cjs', metafile: true, legalComments: 'eof', external: ['electron'] });
  const packages = new Map();
  for (const file of Object.keys(result.metafile.inputs)) {
    if (!file.includes('node_modules/')) continue;
    let directory = path.dirname(path.resolve(file));
    while (!fs.existsSync(path.join(directory, 'package.json')) || !JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8')).name) { const parent = path.dirname(directory); if (parent === directory) throw Error('Missing dependency manifest'); directory = parent; }
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (packages.has(manifest.name)) continue;
    const notices = fs.readdirSync(directory).filter(name => /^(license|licence|copying|notice)([-.]|$)/i.test(name) && fs.statSync(path.join(directory, name)).isFile());
    if (!notices.length || !manifest.license) throw Error('Missing MCP license: ' + manifest.name);
    packages.set(manifest.name, { name: manifest.name, version: manifest.version, license: manifest.license, text: notices.map(name => fs.readFileSync(path.join(directory, name), 'utf8')).join('\n') });
  }
  const records = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(output, 'THIRD-PARTY-NOTICES.txt'), records.map(record => `===== ${record.name} ${record.version} (${record.license}) =====\n${record.text}`).join('\n\n'));
  fs.writeFileSync(path.join(output, 'components.json'), JSON.stringify(records.map(({ text, ...record }) => record), null, 2));
  console.log('Built MCP runtime:', records.length, 'licensed components');
}
module.exports = { buildMcp };
if (require.main === module) buildMcp().catch(() => { console.error('MCP_BUILD_FAILED'); process.exitCode = 1; });
