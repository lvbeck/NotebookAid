const test=require('node:test'),assert=require('node:assert/strict');
const {safeInlineStyle}=require('../dist/runtime/shared/inline-style'),{parseDelta}=require('../dist/runtime/shared/delta-document');
test('inline colors accept bounded palette values and reject executable or unrelated CSS',()=>{
 for(const value of ['color: #e60000; background-color: rgb(255, 255, 0);','color:RGB(10,20,30)','background-color:#FFFFFF'])assert(safeInlineStyle(value),value);
 for(const value of ['','color:red','color:rgb(256,0,0)','background:url(https://example.invalid)','color:#123456;position:absolute','color:#123456;color:#654321'])assert(!safeInlineStyle(value),value);
 const document=attributes=>JSON.stringify({format:'NotebookAidDelta',version:1,ops:[{insert:'Styled',attributes},{insert:'\n'}]});
 assert(parseDelta(document({underline:true,strike:true,color:'#e60000',background:'#ffff00'})));
 for(const attributes of [{underline:false},{color:'red'},{background:'url(x)'},{color:'#123'}])assert.throws(()=>parseDelta(document(attributes)),{code:'INVALID_DELTA'});
});
