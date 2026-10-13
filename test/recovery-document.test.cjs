const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recoveryFileName } = require('../dist/runtime/shared/recovery-document');

test('recovery PDF suggestions include the notebook name and stay within one filename', () => {
  assert.equal(recoveryFileName('思维手记'), 'NotebookAid-思维手记-recovery-key.pdf');
  assert.equal(recoveryFileName('CON'), 'NotebookAid-CON-recovery-key.pdf');
  assert.equal(recoveryFileName(' ../Work:Tasks\\2026?*<>|"\n. '), 'NotebookAid-.._Work_Tasks_2026_______-recovery-key.pdf');
  assert.equal(recoveryFileName(' ... '), 'NotebookAid-notebook-recovery-key.pdf');
  assert.equal(recoveryFileName('📚'.repeat(100)), 'NotebookAid-' + '📚'.repeat(80) + '-recovery-key.pdf');
});
