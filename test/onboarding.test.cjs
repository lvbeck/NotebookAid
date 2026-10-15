const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),path=require('node:path');
const { SettingsStore }=require('../dist/runtime/core/settings');
const { defaultOnboarding,validOnboarding }=require('../dist/runtime/shared/onboarding');

test('guide state validates boundaries and preserves old settings, progress and completion on restart',()=>{
 fs.mkdirSync('output/onboarding-tests',{recursive:true});const root=fs.mkdtempSync(path.resolve('output/onboarding-tests/case-'));
 const legacy={locale:null,theme:null,autosave:null};let store=new SettingsStore(root,legacy);
 assert.equal(store.get().global.onboarding,undefined);assert.equal(defaultOnboarding.enabled,true);
 const initial=store.get();
 for(const bad of [null,{},[],{...defaultOnboarding,step:-1},{...defaultOnboarding,step:6},{...defaultOnboarding,step:1.1},{...defaultOnboarding,enabled:1},{...defaultOnboarding,step:2},{...defaultOnboarding,completed:true},{...defaultOnboarding,extra:true},{...defaultOnboarding,version:2}]){
   assert.equal(validOnboarding(bad),false);assert.throws(()=>store.update({onboarding:bad}),e=>e.code==='INVALID_INPUT');assert.deepEqual(store.get(),initial);
 }
 for(let step=0;step<6;step++){store.update({onboarding:{...defaultOnboarding,started:true,step}});store=new SettingsStore(root,legacy);assert.equal(store.get().global.onboarding.step,step);}
 const done={...defaultOnboarding,started:true,completed:true,step:5};store.update({onboarding:done});assert.deepEqual(new SettingsStore(root,legacy).get().global.onboarding,done);
 store.update({onboarding:{...done,enabled:false}});store.update({theme:'dark'});assert.equal(new SettingsStore(root,legacy).get().global.onboarding.enabled,false);
 store.update({onboarding:{...defaultOnboarding,started:true}});assert.equal(store.get().global.onboarding.completed,false);
});
test('failed progress writes retain the last durable step',()=>{
 fs.mkdirSync('output/onboarding-tests',{recursive:true});const root=fs.mkdtempSync(path.resolve('output/onboarding-tests/failure-'));const legacy={locale:null,theme:null,autosave:null};const store=new SettingsStore(root,legacy);const state={...defaultOnboarding,started:true,step:2};store.update({onboarding:state});const before=fs.readFileSync(path.join(root,'settings.json'));
 const broken=new SettingsStore(root,legacy,()=>{throw Error('simulated');});assert.throws(()=>broken.update({onboarding:{...state,step:3}}),e=>e.code==='WRITE_FAILED');assert.deepEqual(broken.get().global.onboarding,state);assert.deepEqual(fs.readFileSync(path.join(root,'settings.json')),before);
});
test('guide labels are complete in all ten locales',()=>{
 const {onboardingTranslations,onboardingText}=require('../dist/runtime/src/app/onboarding-i18n');const keys=Object.keys(onboardingTranslations.en).sort();assert.equal(Object.keys(onboardingTranslations).length, 10);
 for(const [locale,text]of Object.entries(onboardingTranslations)){assert.deepEqual(Object.keys(text).sort(),keys);for(const value of Object.values(text))assert.ok(typeof value==='string'&&value.trim(),locale);assert.ok(onboardingText(locale,'progress',2).includes('3'));}
 assert.equal(onboardingText('zh-CN','doneLabel'),'引导完成');
});
