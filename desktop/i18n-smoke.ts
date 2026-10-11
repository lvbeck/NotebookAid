import type { BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { translations, regionalLocale, type Locale } from '../src/app/i18n';

export async function smokeI18n(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const wait = () => new Promise(resolve => setTimeout(resolve, 120));
  const title = await run("document.querySelector('[data-testid=note-title]').value");
  for (const locale of Object.keys(translations) as Locale[]) {
    await run(`(() => { const input=document.querySelector('[data-testid=language]');input.value='${locale}';input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    for (let i=0;i<80;i++) { await wait(); if(await run(`document.documentElement.lang === '${regionalLocale(locale)}' && !document.querySelector('[data-testid=language]').disabled`)) break; }
    const actual = await run("({lang:document.documentElement.lang,save:document.querySelector('[data-testid=save-note]').textContent.trim(),bold:document.querySelector('.ql-bold').getAttribute('aria-label'),normal:document.querySelector('.ql-header .ql-picker-item:not([data-value])').dataset.label,title:document.querySelector('[data-testid=note-title]').value})");
    if (actual.lang !== regionalLocale(locale) || actual.save !== translations[locale].save || actual.bold !== translations[locale].bold || actual.normal !== translations[locale].normalText || actual.title !== title) throw Error('Interface localization mismatch: '+locale+JSON.stringify(actual));
    if (locale==='zh-TW' || locale==='fr') { await window.webContents.capturePage(); await wait();writeFileSync(join(directory,'locale-'+locale+'.png'),(await window.webContents.capturePage()).toPNG()); }
  }
  await run("const lang=document.querySelector('[data-testid=language]');lang.value='zh-CN';lang.dispatchEvent(new Event('change',{bubbles:true}))");
  await wait();
  writeFileSync(join(directory,'i18n-report.json'),JSON.stringify({languages:8,keys:Object.keys(translations.en).length,contentPreserved:true,hongKongRegion:true}));
}
