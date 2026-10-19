import { nativeTheme, type BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { notebookSkinColors, notebookSkinNames, skinTokens } from '../shared/notebook-skin';

export async function smokeSkin(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (script: string) => { for (let n = 0; n < 200; n++) { if (await run(script)) return; await new Promise(resolve => setTimeout(resolve, 80)); } throw Error('Skin timeout: ' + script); };
  const click = async (selector: string) => { await until(`document.querySelector(${JSON.stringify(selector)})?.disabled===false`); await run(`document.querySelector(${JSON.stringify(selector)}).click()`); };
  const value = async (selector: string, text: string) => { await run(`{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(text)};e.dispatchEvent(new Event('change',{bubbles:true}));}`); };
  const accent = async (index: number, dark: boolean) => until(`document.documentElement.dataset.skin==='${index}' && getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()===${JSON.stringify(skinTokens(index, dark).accent)}`);
  const capture = async (name: string) => { await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); await new Promise(resolve => setTimeout(resolve, 1000)); writeFileSync(join(directory, name + '.json'), JSON.stringify(await run("({skin:document.documentElement.dataset.skin,theme:document.documentElement.dataset.theme,accent:getComputedStyle(document.documentElement).getPropertyValue('--accent'),background:getComputedStyle(document.body).backgroundColor,color:document.querySelector('[data-testid=notebook-color]').value})"))); writeFileSync(join(directory, name), (await window.webContents.capturePage()).toPNG()); };
  await until("document.querySelector('app-root')?.dataset.ready==='true'");
  if (process.argv.includes('--self-test-reopen')) {
    const ids = JSON.parse(readFileSync(join(directory, 'skin-fixture.json'), 'utf8'));
    await accent(3, false);
    const state = await run('window.notebookAid.library.registry()');
    if (state.value.activeId !== ids.first || state.value.entries[0].appearance.color !== '#92a8ba') throw Error('Skin persistence mismatch');
    writeFileSync(join(directory, 'skin-reopen.json'), JSON.stringify({ persisted: true, legacyBlue: true })); return;
  }
  const state = await run('window.notebookAid.library.registry()'); const first = state.value.activeId;
  await click('[data-testid=libraries-tab]'); await click('[data-testid=library-settings]');
  await until("!!document.querySelector('[data-testid=notebook-appearance]')");
  for (const locale of Object.keys(notebookSkinNames)) {
    await value('[data-testid=language]', locale);
    await until(`document.querySelectorAll('.notebook-swatch')[3].getAttribute('aria-label').startsWith(${JSON.stringify(notebookSkinNames[locale][3])})`);
  }
  await value('[data-testid=language]', 'zh-CN');
  for (let index = 0; index < 10; index++) {
    await click('.notebook-swatch:nth-child(' + (index + 1) + ')'); await click('[data-testid=notebook-appearance-save]');
    await until("!document.querySelector('[data-testid=notebook-appearance-save]').disabled");
    for (const mode of ['light', 'dark']) { await value('[data-testid=theme]', mode); await accent(index, mode === 'dark'); }
  }
  await value('[data-testid=theme]', 'light');
  writeFileSync(join(directory, 'registry-dialog.json'), JSON.stringify({ path: join(directory, 'second') }));
  const secondState = await run("window.notebookAid.library.register('create')"); if (!secondState.ok) throw Error('Fixture registration failed');
  const second = secondState.value.entries.find((entry: { id: string }) => entry.id !== first).id;
  const result = await run(`window.notebookAid.library.setNotebookAppearance(${JSON.stringify(second)},{version:1,color:'#78b9e8',cover:null})`); if (!result.ok) throw Error('Fixture appearance failed');
  await click('[data-testid=libraries-tab]'); await click('[data-testid=library-refresh]');
  await click(`[data-library-id="${second}"] [data-testid=library-open]`); await accent(3, false);
  await click('[data-testid=libraries-tab]'); await click(`[data-library-id="${first}"] [data-testid=library-open]`); await accent(9, false);
  await click('[data-testid=libraries-tab]'); await click(`[data-library-id="${first}"] [data-testid=library-settings]`);
  await until("!!document.querySelector('[data-testid=notebook-color]')");
  await run("{const e=document.querySelector('[data-testid=notebook-color]');e.value='#92a8ba';e.dispatchEvent(new Event('input',{bubbles:true}));}");
  await click('[data-testid=notebook-appearance-save]'); await accent(3, false);
  writeFileSync(join(directory, 'skin-fixture.json'), JSON.stringify({ first, second }));
  await capture('skin-light.png');
  await value('[data-testid=theme]', 'dark'); await accent(3, true);
  await capture('skin-dark.png');
  await value('[data-testid=theme]', 'system');
  const original = nativeTheme.themeSource;
  try { nativeTheme.themeSource = 'light'; await accent(3, false); nativeTheme.themeSource = 'dark'; await accent(3, true); }
  finally { nativeTheme.themeSource = original; }
  await value('[data-testid=theme]', 'light'); await accent(3, false);
  writeFileSync(join(directory, 'skin-report.json'), JSON.stringify({ schemes: 20, locales: 10, notebookSwitch: true, legacyBlue: true, customPickerRetained: true }));
}
