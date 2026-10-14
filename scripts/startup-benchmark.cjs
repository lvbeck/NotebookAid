const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const baseline = process.argv.includes('--baseline');
const { NoteLibrary } = require(baseline && fs.existsSync(path.resolve('output/startup-baseline/core/library.js')) ? '../output/startup-baseline/core/library.js' : '../dist/runtime/core/library.js');
const root = path.resolve('output/startup-benchmark');
fs.mkdirSync(root, { recursive: true });
const directory = path.join(root, 'library');
if (!fs.existsSync(path.join(directory, 'library.json'))) {
  const library = new NoteLibrary(directory);
  try {
    for (let i = 0; i < 62; i++) {
      let note = library.create(randomUUID(), { primaryFormat: 'markdown', title: 'Synthetic note ' + i, body: '# Synthetic\n\n' + 'Benchmark text. '.repeat(1800) }).note;
      const session = library.begin(note.id, 'benchmark');
      for (let version = 2; version <= 8; version++) note = library.save({ noteId: note.id, token: session.token, generation: session.generation, expectedVersion: note.version, operationId: randomUUID(), title: note.title, body: note.body + '\nVersion ' + version }, 'benchmark').note;
      library.end(session.token, session.generation, 'benchmark');
    }
  } finally { library.close(); }
}
const runs = [];
for (let i = 0; i < 5; i++) {
  let bodies = 0, metadata = 0, receipts = 0, bytes = 0;
  const original = fs.readFileSync;
  fs.readFileSync = function(file, ...args) {
    const result = original.call(this, file, ...args), name = String(file);
    bytes += Buffer.byteLength(result);
    if (/content\.(md|txt|html|nadelta)$/.test(name)) bodies++;
    if (name.endsWith('metadata.json')) metadata++;
    if (name.includes(path.sep + 'recovery' + path.sep)) receipts++;
    return result;
  };
  const start = performance.now(); let library;
  try {
    library = new NoteLibrary(directory);
    const opened = performance.now();
    const notes = library.list(); const listed = performance.now();
    library.organization(); library.query({ limit: 30 });
    const queried = performance.now();
    library.begin(library.status().resumeNoteId ?? notes[0].id, 'benchmark');
    if (process.argv.includes('--baseline')) library.query({ limit: 30 });
    runs.push({ openMs: opened - start, listMs: listed - opened, queryMs: queried - listed, totalMs: performance.now() - start, bodies, metadata, receipts, bytes, startup: library.status().startup });
  } finally { fs.readFileSync = original; library?.close(); }
}
const median = key => [...runs].sort((a, b) => a[key] - b[key])[2][key];
const report = { fixture: { notes: 62, revisionsPerNote: 8, bodyBytesApprox: 27000 }, operatingSystemCacheCleared: false, source: baseline ? 'accepted HEAD baseline' : require('../package.json').version, medians: Object.fromEntries(['openMs', 'listMs', 'queryMs', 'totalMs', 'bodies', 'metadata', 'receipts', 'bytes'].map(key => [key, median(key)])), runs };
fs.writeFileSync(path.join(root, process.argv.includes('--baseline') ? 'baseline.json' : 'optimized.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ fixture: report.fixture, medians: report.medians }));
