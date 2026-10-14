const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { bridgeEndpoint, prepareBridgeEndpoint } = require('../dist/runtime/desktop/bridge-endpoint');
const { FrameDecoder, encodeFrame } = require('../dist/runtime/desktop/framing');

test('macOS native bridge frames requests, authenticates core calls, denies unknown operations and rejects tampered endpoints', { skip:process.platform !== 'darwin' }, async t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(),'notebookaid-bridge-'));
  const endpoint = bridgeEndpoint(home); prepareBridgeEndpoint(endpoint);
  for (const [from, to] of [['native/macos/bridge.cjs','bridge.cjs'],['dist/runtime/desktop/bridge-endpoint.js','bridge-endpoint.cjs'],['dist/runtime/desktop/framing.js','framing.cjs']]) fs.copyFileSync(from,path.join(home,to));
  const token = 'a'.repeat(64), calls = [];
  const server = net.createServer(socket => { const decoder=new FrameDecoder();socket.on('error',()=>{});socket.on('data',bytes=>{for(const request of decoder.push(bytes)){calls.push(request);socket.end(encodeFrame({ok:request.token===token,value:'fixture'}));}}); });
  await new Promise(resolve=>server.listen(endpoint.address,resolve));fs.chmodSync(endpoint.address,0o600);
  const file=path.join(home,'bridge-runtime.json');
  fs.writeFileSync(file,JSON.stringify({pipe:endpoint.name,socket:endpoint.address,token,pid:process.pid}),{mode:0o600});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});fs.rmdirSync(endpoint.directory);});
  async function run(requests) {
    const child=spawn(process.execPath,[path.join(home,'bridge.cjs')],{env:{...process.env,NOTEBOOKAID_TEST_HOME:home},stdio:['pipe','pipe','pipe']});
    const decoder=new FrameDecoder(),results=[];let stderr=''; child.stdout.on('data',b=>results.push(...decoder.push(b)));child.stderr.on('data',b=>{stderr+=b;});
    const completion=once(child,'exit');child.stdin.end(Buffer.concat(requests.map(encodeFrame))); const [code]=await completion;
    assert.equal(code,0,stderr);return results;
  }
  assert.deepEqual(await run([{method:'status'},{method:'unknown'},{method:'query',query:{}}]),[{ok:true,value:'fixture'},{ok:false,error:'INVALID_REQUEST'},{ok:true,value:'fixture'}]);
  assert.equal(calls.length,2);assert(calls.every(call=>call.token===token));
  fs.writeFileSync(file,JSON.stringify({pipe:endpoint.name,socket:'/tmp/foreign.sock',token,pid:process.pid}));
  assert.deepEqual(await run([{method:'status'}]),[{ok:false,error:'BACKGROUND_UNAVAILABLE'}]);assert.equal(calls.length,2);
});
