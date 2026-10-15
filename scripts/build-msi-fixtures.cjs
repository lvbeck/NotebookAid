const {buildMsi} = require('./build-msi.cjs');
const path = require('node:path');
const parts = require('../package.json').version.split('.').map(Number);
if (parts[2] < 1 || parts[2] >= 65535) throw Error('MSI fixture versions require a patch version between 1 and 65534.');
(async () => {
  await buildMsi([parts[0],parts[1],parts[2]-1].join('.'), path.resolve('output/msi-fixtures/older'));
  await buildMsi([parts[0],parts[1],parts[2]+1].join('.'), path.resolve('output/msi-fixtures/failure'), true);
})().catch(error => { console.error(error); process.exitCode = 1; });
