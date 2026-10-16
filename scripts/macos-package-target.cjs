const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

function requireArtifact(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
    throw Error(`Missing or empty macOS package: ${file}`);
  }
}

async function packageTarget({ target, file, args, run = spawnSync, wait = delay, log = console.log }) {
  const attempts = target === 'dmg' ? 3 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // An earlier partial output must never satisfy this attempt's delivery check.
    fs.rmSync(file, { force: true });
    const result = run(process.execPath, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    log(output);
    const busy = /(?:couldn't eject|unable to detach)[\s\S]*?Resource busy/i.test(output);
    if (!result.error && result.status === 0 && !busy) {
      requireArtifact(file);
      return file;
    }
    fs.rmSync(file, { force: true });
    if (!busy || attempt === attempts) {
      throw Error(`macOS ${target} packaging failed (attempt ${attempt}/${attempts}).`, { cause: result.error });
    }
    log(`DMG detach was busy; retrying only this target after ${attempt * 10} seconds (${attempt}/${attempts}).`);
    await wait(attempt * 10000);
  }
}

module.exports = { packageTarget, requireArtifact };
