const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { bridgeEndpoint } = require('./bridge-endpoint.cjs');
const { FrameDecoder, encodeFrame } = require('./framing.cjs');
const allowed = new Set(['status', 'open', 'start', 'handshake', 'query', 'organization', 'preview', 'trash', 'openNote', 'mapTags', 'changes', 'image']);
const home = process.env.NOTEBOOKAID_TEST_HOME || path.join(os.homedir(), 'Library/Application Support/NotebookAid/state');

function privateFile(file, directory = false) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) throw Error('Unsafe bridge state');
  return stat;
}
function callCore(request) {
  const file = path.join(home, 'bridge-runtime.json');
  if (privateFile(file).size > 16384) throw Error('Invalid bridge state');
  const runtime = JSON.parse(fs.readFileSync(file, 'utf8'));
  const endpoint = bridgeEndpoint(home);
  if (runtime.socket !== endpoint.address || runtime.pipe !== endpoint.name || !/^[a-f0-9]{64}$/.test(runtime.token) || !Number.isSafeInteger(runtime.pid) || runtime.pid < 1) throw Error('Invalid bridge endpoint');
  privateFile(endpoint.directory, true);
  const stat = fs.lstatSync(endpoint.address);
  if (!stat.isSocket() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) throw Error('Unsafe bridge socket');
  process.kill(runtime.pid, 0);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(endpoint.address), decoder = new FrameDecoder();
    const timer = setTimeout(() => { socket.destroy(); reject(Error('Bridge timeout')); }, 25000);
    const finish = () => { clearTimeout(timer); socket.destroy(); };
    socket.once('error', () => { finish(); reject(Error('Bridge connection failed')); });
    socket.once('connect', () => socket.write(encodeFrame({ ...request, token: runtime.token })));
    socket.on('data', bytes => { try { const frames = decoder.push(bytes); if (frames.length) { finish(); resolve(frames[0]); } } catch (error) { finish(); reject(error); } });
    socket.once('end', () => { finish(); reject(Error('Bridge closed')); });
  });
}
async function handle(request) {
  if (!request || !allowed.has(request.method)) return { ok: false, error: 'INVALID_REQUEST' };
  const method = request.method === 'start' ? 'status' : request.method;
  try { return await callCore({ ...request, method }); } catch {
    if (!['start', 'open'].includes(request.method)) return { ok: false, error: 'BACKGROUND_UNAVAILABLE' };
    const executable = path.resolve(__dirname, '../../MacOS/NotebookAid');
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(executable, ['--background'], { detached: true, stdio: 'ignore', env });
    child.on('error', () => {}); child.unref();
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      try { return await callCore({ ...request, method }); } catch { /* Wait for the independent application. */ }
    }
    return { ok: false, error: 'BACKGROUND_UNAVAILABLE' };
  }
}
async function main() {
  const decoder = new FrameDecoder();
  for await (const chunk of process.stdin) {
    for (const request of decoder.push(chunk)) {
      const response = encodeFrame(await handle(request));
      if (!process.stdout.write(response)) await new Promise(resolve => process.stdout.once('drain', resolve));
    }
  }
}
main().catch(() => { process.exitCode = 1; });
