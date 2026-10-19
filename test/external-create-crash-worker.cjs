const fs = require('node:fs'), path = require('node:path');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { ExternalNoteService } = require('../dist/runtime/core/external-notes.js');
const [directory, stage, libraryId, requestId] = process.argv.slice(2);
// Only a parent-created synthetic directory is accepted; never receive content or credentials.
const root = path.resolve('output/external-retry-tests');
if (!path.resolve(directory).startsWith(root + path.sep) || !fs.existsSync(path.join(directory, 'synthetic-crash-fixture'))) process.exit(2);
const library = new NoteLibrary(directory, point => { if (point === stage) { fs.writeFileSync(path.join(directory, 'crash-stage.txt'), stage); process.exit(75); } }, 'existing');
const service = new ExternalNoteService(() => ({ library, appUnlocked: true, busy: false }), () => ({ libraryId, folderId: null }));
service.create({ libraryId, requestId, title: 'Synthetic crash title', body: 'Synthetic crash body\n中文 📝' });
process.exit(3);
