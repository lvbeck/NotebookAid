const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const workspace = path.resolve(__dirname, '..');
const executable = path.resolve(process.argv[2] || path.join(process.env.ProgramFiles || 'C:\\Program Files', 'NotebookAid/NotebookAid.exe'));
const installation = path.join(path.dirname(executable), 'installation.json');
const metadata = JSON.parse(fs.readFileSync(installation, 'utf8'));
if (metadata.owner !== 'NotebookAid.Installation.v1' || !['msi', 'nsis'].includes(metadata.installer)) {
    throw Error('An installed NotebookAid executable is required');
}
const harness = path.join(workspace, 'dist/runtime/desktop/ui-smoke.js');
const archive = path.join(path.dirname(executable), 'resources/app.asar');
const main = path.join(archive, 'runtime/desktop/main.js');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = { executable: hash(executable), archive: hash(archive), installation: hash(installation), harness: hash(harness) };
const root = path.join(workspace, 'output/ui-installed', String(Date.now()));
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, 'backups.json'), JSON.stringify({ version: 1, policies: { '00000000-0000-0000-0000-000000000000': { directory: path.join(root, 'backup-fixture'), enabled: true, nextAt: 1, lastAt: null } } }));
/** Run one isolated GUI pass against the installed app without replacing program files. */
async function run(argument, report) {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/^NOTEBOOKAID_.*TEST/.test(key) || ['ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS'].includes(key)) {
            delete env[key];
        }
    }
    Object.assign(env, { NOTEBOOKAID_TEST_HOME: root, NOTEBOOKAID_UI_TEST: '1', NOTEBOOKAID_UI_TEST_EXPECT_UPDATE_PHASE: 'unconfigured' });
    const child = cp.spawn(executable, ['--inspect-brk=127.0.0.1:0', argument], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '', socket;
    const exited = new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', code => resolve(code));
    });
    const address = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Installed test inspector did not start; process ' + child.pid)), 15000);
        child.stderr.on('data', bytes => {
            log += bytes;
            const match = log.match(/ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+/);
            if (match) {
                clearTimeout(timer);
                resolve(match[0]);
            }
        });
        child.once('exit', () => {
            clearTimeout(timer);
            reject(Error('Installed test exited before inspector startup'));
        });
    });
    child.stdout.on('data', bytes => {
        log += bytes;
    });
    const proof = path.join(root, report + '.harness.json');
    try {
        socket = new WebSocket(await address);
        await new Promise((resolve, reject) => {
            socket.addEventListener('open', resolve, { once: true });
            socket.addEventListener('error', reject, { once: true });
        });
        let id = 0, paused;
        const pending = new Map(), pausedEvent = new Promise(resolve => {
            paused = resolve;
        });
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.method === 'Debugger.paused') {
                paused(message.params);
            }
            const task = pending.get(message.id);
            if (task) {
                pending.delete(message.id);
                message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result);
            }
        });
        // Match inspector replies to requests and fail stalled commands within a bounded wait.
        const send = (method, params = {}) => new Promise((resolve, reject) => {
            const request = ++id, timer = setTimeout(() => {
                pending.delete(request);
                reject(Error('Inspector command timed out: ' + method));
            }, 10000);
            pending.set(request, { resolve: value => {
                    clearTimeout(timer);
                    resolve(value);
                }, reject: error => {
                    clearTimeout(timer);
                    reject(error);
                } });
            socket.send(JSON.stringify({ id: request, method, params }));
        });
        socket.addEventListener('close', () => {
            for (const task of pending.values()) {
                task.reject(Error('Installed test inspector disconnected'));
            }
            pending.clear();
        });
        await send('Debugger.enable');
        await send('Runtime.runIfWaitingForDebugger');
        const frame = await pausedEvent;
        // Substitute only the test module before main loads it; all installed product modules stay intact.
        const expression = `(() => {
      const Module = process.getBuiltinModule('module');
      const original = Module._load;
      Module._load = function(request, parent, isMain) {
        if (request === './ui-smoke' && parent?.filename.toLowerCase() === ${JSON.stringify(main.toLowerCase())}) {
          Module._load = original;
          process.getBuiltinModule('fs').writeFileSync(${JSON.stringify(proof)}, JSON.stringify({ module: ${JSON.stringify(harness)}, sha256: ${JSON.stringify(before.harness)} }));
          return original.call(this, ${JSON.stringify(harness)}, parent, isMain);
        }
        return original.call(this, request, parent, isMain);
      };
      return true;
    })()`;
        const injected = await send('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrames[0].callFrameId, expression, returnByValue: true });
        if (injected.exceptionDetails || injected.result?.value !== true) {
            throw Error('Cannot load the corrected installed UI test harness');
        }
        await send('Debugger.resume');
        socket.close();
        let timeout;
        const code = await Promise.race([exited, new Promise((_resolve, reject) => {
                timeout = setTimeout(() => reject(Error('Installed UI test timed out; close test process ' + child.pid)), 180000);
            })]).finally(() => clearTimeout(timeout));
        fs.writeFileSync(path.join(root, report + '.log'), log);
        const error = path.join(root, 'smoke-error.txt');
        if (code !== 0 || fs.existsSync(error) || !fs.existsSync(proof) || !fs.existsSync(path.join(root, report))) {
            throw Error(fs.existsSync(error) ? fs.readFileSync(error, 'utf8') : 'Installed UI test failed: ' + code);
        }
        const value = JSON.parse(fs.readFileSync(path.join(root, report), 'utf8'));
        console.log(JSON.stringify({ argument, root, exitCode: code, report: value }));
        return value;
    }
    finally {
        socket?.close();
    }
}
// Run both passes against the same fixture and verify the installed program stays unchanged.
(async () => {
    const results = [];
    for (const [argument, report] of [['--self-test', 'ui-report.json'], ['--self-test-reopen', 'ui-reopen.json']]) {
        results.push(await run(argument, report));
    }
    if (hash(executable) !== before.executable || hash(archive) !== before.archive || hash(installation) !== before.installation || hash(harness) !== before.harness) {
        throw Error('Installed program or harness changed during verification');
    }
    fs.writeFileSync(path.join(root, 'installed-ui-verification.json'), JSON.stringify({ executable, installation: metadata.installer, root, installedFilesUnchanged: true, hashes: before, results }, null, 2));
})().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
