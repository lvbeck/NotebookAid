const fs = require('node:fs'), path = require('node:path');

function writeNativeAssemblyInfo(directory = path.resolve('dist/native'), version = require('../package.json').version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match || match.slice(1).some(value => Number(value) > 65535)) throw Error('Invalid native assembly version.');
  const fileVersion = match.slice(1).join('.') + '.0';
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'NotebookAid.AssemblyInfo.cs');
  fs.writeFileSync(file, [
    'using System.Reflection;',
    '[assembly: AssemblyTitle("NotebookAid")]',
    '[assembly: AssemblyDescription("NotebookAid native helper")]',
    '[assembly: AssemblyProduct("NotebookAid")]',
    '[assembly: AssemblyCompany("Jin Lu")]',
    '[assembly: AssemblyCopyright("Copyright (c) 2026, Jin Lu")]',
    '[assembly: AssemblyVersion("' + fileVersion + '")]',
    '[assembly: AssemblyFileVersion("' + fileVersion + '")]',
    '[assembly: AssemblyInformationalVersion("' + version + '")]',
    '',
  ].join('\n'), 'utf8');
  return file;
}

module.exports = { writeNativeAssemblyInfo };
