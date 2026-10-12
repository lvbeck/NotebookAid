const { copyFileSync } = require('node:fs');
copyFileSync('node_modules/dompurify/dist/purify.js', 'dist/runtime/desktop/purify.js');
require('./build-passkey.cjs');
