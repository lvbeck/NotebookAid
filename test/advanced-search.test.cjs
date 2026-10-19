const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { highlightTitle } = require('../dist/runtime/shared/search');
const { searchText, tagColorName, tagPalette } = require('../dist/runtime/src/app/search-i18n');

test('advanced search combines keyword modes, descendant folders, all tags, pins and pagination without returning bodies', () => {
  const root = fs.mkdtempSync(path.resolve('output/advanced-search-')); const lib = new NoteLibrary(root, undefined, 'create');
  try {
    const parent = randomUUID(), child = randomUUID(), tag = randomUUID(), other = randomUUID();
    for (const input of [{kind:'folder',id:parent,name:'Work',parentId:null},{kind:'folder',id:child,name:'Project',parentId:parent},{kind:'tag',id:tag,name:'Important',color:'#A43948'},{kind:'tag',id:other,name:'Project',color:'#355C91'}]) lib.editOrganization({...input,expectedVersion:lib.organization().version});
    for (let i=0;i<24;i++) {
      const note=lib.create(randomUUID(),{primaryFormat:'text',title:`Project ${i}`,body:i%2 ? 'Release planning' : 'Archive notes',folderId:child}).note;
      const session=lib.begin(note.id,'test');lib.place({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),folderId:child,tagIds:i%2?[tag,other]:[other],pinned:i%3===0},'test');
    }
    assert.equal(lib.query({keywords:['Project','release'],matchMode:'AND'}).total,12);
    assert.equal(lib.query({keywords:['Missing','Release'],matchMode:'OR'}).total,12);
    assert.equal(lib.query({keywords:['release planning'],folderId:parent,tagIds:[tag,other],view:'pinned'}).total,4);
    assert.equal(lib.query({keywords:[],view:'all',folderId:null}).total,0);
    for (const limit of [10,20,50,100]) { const result=lib.query({keywords:['ＰＲＯＪＥＣＴ'],limit});assert.equal(result.total,24);assert.equal(result.notes.length,Math.min(limit,24));assert.ok(result.notes.every(n=>!('body'in n)&&!('taskSource'in n))); }
    const first=lib.query({limit:10}),second=lib.query({limit:10,offset:10});assert.equal(new Set([...first.notes,...second.notes].map(n=>n.id)).size,20);
    assert.equal(lib.query({text:'Project release'}).total,12);
    for(const input of [{keywords:null},{keywords:[1]},{keywords:['x'.repeat(301)]},{keywords:Array(9).fill('a')},{keywords:['a'],matchMode:'INVALID'},{limit:101}]) assert.throws(()=>lib.query(input),e=>e.code==='INVALID_INPUT');
  } finally { lib.close(); fs.rmSync(root,{recursive:true,force:true}); }
});

test('title highlighting preserves literal text, overlap, Unicode and markup without generating HTML', () => {
  for(const [title,terms]of [['ＡＩ Project <script>',['ai','project','<script>']],['aaaa',['aa','aaa']],['🎉中文搜索',['中文']],['<img onerror=alert(1)>',['img']],['Normal',[]]]) {
    const parts=highlightTitle(title,terms);assert.equal(parts.map(p=>p.text).join(''),title);assert.ok(parts.every(p=>typeof p.matched==='boolean'));
  }
  assert.equal(highlightTitle('ＡＩ Project',['AI'])[0].matched,true);
  assert.deepEqual(highlightTitle('Cafe\u0301',['café']),[{text:'Cafe\u0301',matched:true}]);
  assert.deepEqual(highlightTitle('ΟΣ',['ος']),[{text:'ΟΣ',matched:true}]);
  assert.deepEqual(highlightTitle('aaaa',['aa','aaa']),[{text:'aaaa',matched:true}]);
});

test('folder scope defaults to descendants and accepts an exact-folder boolean without loading bodies', () => {
  const root=fs.mkdtempSync(path.resolve('output/advanced-folder-scope-'));let lib=new NoteLibrary(root,undefined,'create');
  try {
    const parent=randomUUID(),child=randomUUID(),grandchild=randomUUID();
    for(const [id,name,parentId]of [[parent,'Parent',null],[child,'Child',parent],[grandchild,'Grandchild',child]])lib.editOrganization({kind:'folder',id,name,parentId,expectedVersion:lib.organization().version});
    const ids=[parent,child,grandchild,null].map((folderId,index)=>lib.create(randomUUID(),{primaryFormat:'text',title:`Scope ${index}`,body:'Fixture',folderId}).note.id);
    lib.close();lib=new NoteLibrary(root);
    const read=lib.read.bind(lib);let reads=0;lib.read=(...args)=>{reads++;return read(...args);};
    assert.equal(lib.query({folderId:parent}).total,3);
    assert.equal(lib.query({folderId:parent,includeDescendants:true}).total,3);
    assert.deepEqual(lib.query({folderId:parent,includeDescendants:false}).notes.map(note=>note.id),[ids[0]]);
    assert.equal(lib.query({folderId:child,includeDescendants:true}).total,2);
    assert.deepEqual(lib.query({folderId:child,includeDescendants:false}).notes.map(note=>note.id),[ids[1]]);
    assert.deepEqual(lib.query({folderId:null,includeDescendants:true}).notes.map(note=>note.id),[ids[3]]);
    assert.equal(lib.query({includeDescendants:false}).total,4);
    assert.equal(reads,0);
    assert.equal(lib.query({folderId:parent,includeDescendants:false,keywords:['Scope'],matchMode:'OR'}).total,1);
    for(const includeDescendants of [null,0,1,'false',{},[]])assert.throws(()=>lib.query({folderId:parent,includeDescendants}),error=>error.code==='INVALID_INPUT');
  } finally {lib.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('advanced queries keep metadata-only searches lazy and exclude locked encrypted content', async () => {
  const root=fs.mkdtempSync(path.resolve('output/advanced-search-secure-'));let lib=new NoteLibrary(root,undefined,'create');
  try {
    const note=lib.create(randomUUID(),{primaryFormat:'text',title:'Private fixture',body:'Secret fixture'}).note;
    lib.close();lib=new NoteLibrary(root);
    const read=lib.read.bind(lib);let reads=0;lib.read=(...args)=>{reads++;return read(...args);};
    assert.equal(lib.query({keywords:[],limit:10}).total,1);assert.equal(reads,0);
    await lib.securityCommand({action:'setup',password:'Search fixture password 12345'});lib.protect(note.id,note.version,true);
    assert.equal(lib.query({keywords:['Secret'],matchMode:'OR'}).total,1);
    await lib.securityCommand({action:'lock'});
    assert.equal(lib.query({keywords:['Private','Secret'],matchMode:'OR'}).total,0);
    assert.equal(lib.query({keywords:[]}).total,0);
  } finally {lib.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('advanced search and tag palette provide ten complete language dictionaries and ten distinct presets', () => {
  assert.equal(tagPalette.length,10);assert.equal(new Set(tagPalette).size,10);assert.ok(tagPalette.every(color=>/^#[0-9A-F]{6}$/.test(color)));
  for(const locale of ['en','de','fr','it','es','pt-PT','zh-CN','zh-TW','ja','ko']) {
    for(const key of ['title','keywords','add','remove','all','any','folders','folderHint','tagsHint','pinnedOnly','search','reset','results','pageSize','created','modified','loading','empty','hint','custom','palette']) assert.ok(searchText(locale,key)?.trim(),`${locale}:${key}`);
    for(let i=0;i<10;i++)assert.ok(tagColorName(locale,i)?.trim());
  }
});
