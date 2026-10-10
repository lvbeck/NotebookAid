const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { randomUUID } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const [root, id, target] = process.argv.slice(2);
const library = new NoteLibrary(root, stage => { if (stage === target) { writeFileSync(join(root, 'crash-stage.txt'), stage); process.kill(process.pid, 'SIGKILL'); } });
const session = library.begin(id, 'crash-worker');
library.save({ noteId: id, token: session.token, generation: session.generation, expectedVersion: session.note.version, operationId: randomUUID(), title: 'Crash test', body: 'Committed after crash' }, 'crash-worker');
library.close();
