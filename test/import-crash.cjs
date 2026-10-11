const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { planImport, executeImport } = require('../dist/runtime/core/library-import.js');
const target = new NoteLibrary(process.argv[3]);
executeImport(planImport(process.argv[2], target.path), stage => { if (stage === 'note') process.exit(71); });
throw Error('Fault was not reached');
