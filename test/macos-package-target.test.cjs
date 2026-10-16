const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { packageTarget, requireArtifact } = require('../scripts/macos-package-target.cjs');

async function fixture(action) {
  fs.mkdirSync('output', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output/macos-target-'));
  try { await action(path.join(root, 'package.dmg')); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('DMG resource-busy detachment retries only the failed target and rejects stale output', async () => fixture(async file => {
  let attempts = 0;
  const waits = [];
  fs.writeFileSync(file, 'stale');
  await packageTarget({ target: 'dmg', file, args: [], log() {}, wait: async ms => waits.push(ms), run() {
    assert.equal(fs.existsSync(file), false);
    attempts++;
    fs.writeFileSync(file, attempts === 1 ? 'partial' : 'complete');
    return attempts === 1 ? { status: 0, stderr: `hdiutil: couldn't eject "disk2" - Resource busy` } : { status: 0 };
  } });
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [10000]);
  assert.equal(fs.readFileSync(file, 'utf8'), 'complete');
}));

test('persistent DMG busy failures stop after three attempts and remove partial output', async () => fixture(async file => {
  let attempts = 0;
  await assert.rejects(packageTarget({ target: 'dmg', file, args: [], log() {}, wait: async () => {}, run() {
    attempts++; fs.writeFileSync(file, 'partial');
    return { status: 1, stderr: 'Unable to detach device cleanly: Resource busy' };
  } }), /attempt 3\/3/);
  assert.equal(attempts, 3);
  assert.equal(fs.existsSync(file), false);
}));

test('missing or empty packages cannot become successful deliveries', async () => fixture(async file => {
  for (const target of ['dmg', 'zip']) {
    let attempts = 0;
    await assert.rejects(packageTarget({ target, file, args: [], log() {}, run() {
      attempts++; return { status: 0 };
    } }), /Missing or empty/);
    assert.equal(attempts, 1);
  }
  fs.writeFileSync(file, '');
  assert.throws(() => requireArtifact(file), /Missing or empty/);
}));

test('unrelated errors and ZIP failures are not retried', async () => fixture(async file => {
  for (const target of ['dmg', 'zip']) {
    let attempts = 0;
    await assert.rejects(packageTarget({ target, file, args: [], log() {}, run() {
      attempts++; return { status: 1, stderr: 'Permission denied' };
    } }), /packaging failed/);
    assert.equal(attempts, 1);
  }
}));
