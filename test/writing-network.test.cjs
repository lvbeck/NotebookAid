const test=require('node:test'),assert=require('node:assert/strict');
const {AiNetwork}=require('../dist/runtime/desktop/ai-network');
const credential={accessToken:'fixture-token',expiresAt:Date.now()+3600000,scopes:['chatgpt.tokens.use.direct']};
const network=()=>new AiNetwork({credential:id=>id==='chatgpt'?{chatgpt:credential}:{key:'fixture-key'}},async()=>{});
function response(events){return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream'}})}
test('subscription writing uses only explicit public Responses options and waits for completion',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);let request;
 global.fetch=async(url,init)=>{request={url,init};return response([{type:'response.output_text.delta',delta:'Revised '},{type:'response.output_text.delta',delta:'text'},{type:'response.completed'}])};
 assert.equal(await network().writeText('chatgpt','fixture-model','Fixture input',new AbortController().signal),'Revised text');
 assert.equal(request.url,'https://api.openai.com/v1/responses');assert.equal(request.init.redirect,'error');
 assert.deepEqual(JSON.parse(request.init.body),{model:'fixture-model',input:[{role:'user',content:'Fixture input'}],store:false,stream:true});
});
test('incomplete or failed streams never expose partial text as success',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);
 for(const tail of [null,{type:'response.failed'},{type:'response.incomplete'},{type:'error'}]){
  global.fetch=async()=>response([{type:'response.output_text.delta',delta:'Partial private text'},...(tail?[tail]:[])]);
  await assert.rejects(network().writeText('chatgpt','fixture','Fixture',new AbortController().signal));
 }
});
test('API writing keeps provider credentials and billing routes separate',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);let captured;
 global.fetch=async(url,init)=>{captured={url,init};return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Thought',thought:true},{text:'Gemini result'}]}}]})};
 assert.equal(await network().writeText('gemini','models/fixture','Text',new AbortController().signal),'Gemini result');
 assert(captured.url.startsWith('https://generativelanguage.googleapis.com/'));assert.equal(captured.init.headers['x-goog-api-key'],'fixture-key');assert(!captured.init.headers.Authorization);
 global.fetch=async(url,init)=>{captured={url,init};return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'Claude result'}]})};
 assert.equal(await network().writeText('claude','fixture','Text',new AbortController().signal),'Claude result');
 assert.equal(captured.url,'https://api.anthropic.com/v1/messages');assert.equal(captured.init.headers['x-api-key'],'fixture-key');assert(!captured.init.headers.Authorization);
});
test('cancel before dispatch, HTTP denial and oversize responses fail without retry',async t=>{
 const original=global.fetch;t.after(()=>global.fetch=original);let calls=0;
 global.fetch=async()=>{calls++;return new Response('denied',{status:403})};const c=new AbortController();c.abort();
 await assert.rejects(network().writeText('gemini','models/fixture','Text',c.signal),{code:'REQUEST_CANCELLED'});assert.equal(calls,0);
 await assert.rejects(network().writeText('gemini','models/fixture','Text',new AbortController().signal),{code:'ACCESS_DENIED'});assert.equal(calls,1);
 global.fetch=async()=>new Response('x'.repeat(2*1024*1024+1));await assert.rejects(network().writeText('gemini','models/fixture','Text',new AbortController().signal),{code:'OUTPUT_TOO_LARGE_OR_EMPTY'});
});
