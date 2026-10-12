const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const { randomUUID } = require('node:crypto');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { readAppearance, validateAppearance } = require('../dist/runtime/core/notebook-appearance');
function fixture(fault) { const base = path.resolve('output/appearance-core'); fs.mkdirSync(base, { recursive: true }); const root = fs.mkdtempSync(path.join(base, 'case-')); return { root, registry: new LibraryRegistry(root, path.join(root, 'first'), fault) }; }
function crc(data) { let result = 0xffffffff; for (const b of data) { result ^= b; for (let n = 0; n < 8; n++) result = (result >>> 1) ^ (result & 1 ? 0xedb88320 : 0); } return (result ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const h = Buffer.alloc(4); h.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(body)); return Buffer.concat([h, body, c]); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(512); ihdr.writeUInt32BE(512, 4); ihdr[8] = 8; ihdr[9] = 6;
const cover = 'data:image/png;base64,' + Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.alloc(512 * (512 * 4 + 1)))), chunk('IEND', Buffer.alloc(0))]).toString('base64');
const appearance = { version: 1, color: '#9aa99b', cover };
const code = expected => error => error.code === expected;

test('default appearance is violet and empty; per-notebook colors and covers survive restart', () => {
  const { root, registry } = fixture(); let active = registry;
  try {
    registry.get(); const first = registry.state().entries[0]; assert.deepEqual(first.appearance, { version: 1, color: '#7460c9', cover: null });
    registry.add(path.join(root, 'second'), 'create'); const second = registry.state().entries[1];
    registry.setAppearance(second.id, appearance); assert.equal(registry.state().activeId, first.id); assert.equal(registry.state().entries[0].appearance.cover, null);
    registry.close(); active = new LibraryRegistry(root, path.join(root, 'first')); assert.deepEqual(active.state().entries[1].appearance, appearance);
    active.setAppearance(second.id, { ...appearance, cover: null }); assert.equal(active.state().entries[1].appearance.cover, null);
  } finally { active.close(); }
});
test('appearance rejects URLs, SVG, invalid colors, oversized and nonsquare covers', () => {
  for (const value of [{ ...appearance, color: 'red' }, { ...appearance, cover: 'https://example.com/cover.png' }, { ...appearance, cover: 'data:image/svg+xml;base64,PHN2Zy8+' }, { ...appearance, cover: cover + 'A'.repeat(1500000) }, { ...appearance, version: 2 }]) assert.throws(() => validateAppearance(value), code('INVALID_INPUT'));
  const data = Buffer.from(cover.slice(22), 'base64'); data.writeUInt32BE(511, 16); assert.throws(() => validateAppearance({ ...appearance, cover: 'data:image/png;base64,' + data.toString('base64') }), code('INVALID_INPUT'));
});
test('failed appearance write preserves the old value and active editor session', () => {
  let fail = false; const { registry } = fixture(stage => { if (fail && stage === 'appearance') throw Error('Fixture failure'); });
  try { const library = registry.get(), entry = registry.state().entries[0]; const note = library.create(randomUUID()).note, session = library.begin(note.id, 'fixture'); registry.setAppearance(entry.id, appearance); fail = true; assert.throws(() => registry.setAppearance(entry.id, { ...appearance, color: '#bd9da6' }), code('WRITE_FAILED')); assert.deepEqual(readAppearance(entry.path), appearance); assert.equal(registry.get(), library); const saved = library.save({ noteId: note.id, token: session.token, generation: session.generation, expectedVersion: note.version, operationId: randomUUID(), title: 'Retained', body: 'Unsaved draft' }, 'fixture'); assert.equal(saved.note.body, 'Unsaved draft'); } finally { registry.close(); }
});
test('malformed appearance cannot inject content or prevent access to notebook notes', () => {
  const { registry } = fixture();
  try { registry.get(); const entry = registry.state().entries[0]; fs.writeFileSync(path.join(entry.path, 'appearance.json'), '{'); const value = registry.state().entries[0]; assert.equal(value.availability, 'available'); assert.equal(value.appearanceIssue, true); assert.equal(value.appearance.cover, null); assert.throws(() => readAppearance(entry.path), code('INTEGRITY_CHECK_FAILED')); registry.setAppearance(entry.id, appearance); assert.equal(registry.state().entries[0].appearanceIssue, false); } finally { registry.close(); }
});
test('foreign writer and linked appearance paths are rejected', () => {
  const { root, registry } = fixture();
  try { registry.get(); registry.add(path.join(root, 'other'), 'create'); const other = registry.state().entries[1]; const { NoteLibrary } = require('../dist/runtime/core/library'); const locked = new NoteLibrary(other.path, undefined, 'existing'); try { assert.throws(() => registry.setAppearance(other.id, appearance), code('LIBRARY_IN_USE')); } finally { locked.close(); }
    const external = path.join(root, 'external'); fs.mkdirSync(external); fs.symlinkSync(external, path.join(other.path, 'appearance.json'), 'junction'); assert.throws(() => registry.setAppearance(other.id, appearance), code('INVALID_INPUT')); assert.equal(fs.readdirSync(external).length, 0);
  } finally { registry.close(); }
});
