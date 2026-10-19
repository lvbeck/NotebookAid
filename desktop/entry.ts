// The MCP credential broker must not initialize the editor, writer or single-instance lock.
if (process.argv.includes('--mcp-stdio')) {
  void import('./mcp-stdio.js').then(module => module.startMcpStdio()).catch(error => { process.stderr.write(error instanceof Error && ['SECURE_STORAGE_UNAVAILABLE', 'PROFILE_DECRYPT_FAILED', 'INVALID_PROFILE', 'INVALID_INPUT', 'MCP_PROFILE_UNAVAILABLE', 'PROFILE_REQUIRED', 'INVALID_TEST_HOME', 'UNSAFE_PROBE_HOME'].includes(error.message) ? error.message + '\n' : 'MCP_START_FAILED\n'); process.exit(1); });
} else { void import('./main.js'); }
