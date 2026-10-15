const fs = require('node:fs');

function checkVersion() {
  const version = require('../package.json').version;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw Error('Use a numeric major.minor.patch version for every platform.');
  const lock = require('../package-lock.json');
  for (const candidate of [lock.version, lock.packages[''].version, ...['thunderbird', 'thunderbird-compat'].map(directory => JSON.parse(fs.readFileSync(directory + '/manifest.json', 'utf8')).version)]) {
    if (candidate !== version) throw Error('Application, lockfile and addon versions must match.');
  }
  return version;
}

module.exports = { checkVersion };
if (require.main === module) console.log(checkVersion());
