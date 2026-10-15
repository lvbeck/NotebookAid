const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {languages,strings,localizedUi,nativeHeader}=require('../scripts/msi-localization.cjs');
const {locales}=require('../dist/runtime/shared/settings');
const {translations}=require('../dist/runtime/src/app/i18n');
test('ten locales preserve translation placeholders and installer font selection',()=>{
 assert.equal(locales.length,10);assert.deepEqual(Object.keys(languages).sort(),[...locales].sort());
 const placeholders=s=>[...s.matchAll(/\{[a-zA-Z]+\}/g)].map(m=>m[0]).sort();
 for(const locale of locales){
  for(const [key,value]of Object.entries(translations.en))assert.deepEqual(placeholders(translations[locale][key]),placeholders(value),locale+':'+key);
  assert.equal(strings[locale].length,strings.en.length);assert.ok(strings[locale].every(v=>typeof v==='string'&&v.trim()));
 }
 assert.equal(languages['zh-CN'][2],'Microsoft YaHei');assert.equal(languages.ja[2],'Meiryo');assert.equal(languages.ko[2],'Malgun Gothic');
 const ui=localizedUi(fs.readFileSync('installer/msi/UI.xml','utf8'));
 for(const locale of locales)assert.ok(ui.includes('Value="'+locale+'"'));
 assert.ok(ui.includes('FaceName="Microsoft YaHei"'));
 assert.ok(nativeHeader().includes('L"{\\\\NATitle_zhCN}"'));
});
test('Thunderbird label initialization supports all ten app locales',()=>{
 const labels=vm.runInNewContext(fs.readFileSync('thunderbird/labels.js','utf8')+';notebookLabels');
 for(const locale of locales){assert.ok(labels[locale],locale);assert.deepEqual(Object.keys(labels[locale]).sort(),Object.keys(labels.en).sort());for(const value of Object.values(labels[locale]))assert.ok(typeof value==='string'&&value.trim());}
});
test('ten regional READMEs have working reciprocal language links',()=>{
 const files=['README.md','README.zh-CN.md','README.zh-HK.md','README.de-DE.md','README.fr-FR.md','README.it-IT.md','README.es-ES.md','README.pt-PT.md','README.ja-JP.md','README.ko-KR.md'];
 for(const file of files){const text=fs.readFileSync(file,'utf8');for(const link of files)assert.ok(text.includes(']('+link+')'),file+':'+link);assert.ok(text.includes('NotebookAid-windows-x64-test'));assert.ok(text.includes('NotebookAid-windows-x64-msi-test'));}
});
