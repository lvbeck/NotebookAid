import type { BrowserWindow } from 'electron';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
export async function smokeAppearance(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (script: string) => { for (let n = 0; n < 200; n++) { if (await run(script)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Appearance timeout: ' + script); };
  const click = async (id: string) => { await until(`document.querySelector('[data-testid="${id}"]')?.disabled===false`); await run(`document.querySelector('[data-testid="${id}"]').click()`); };
  await until("document.querySelector('[data-testid=create-note]')?.disabled===false");
  if (process.argv.includes('--self-test-reopen')) {
    const expected = JSON.parse(readFileSync(join(directory, 'appearance-expected.json'), 'utf8'));
    const state = await run('window.notebookAid.library.registry()');
    if (!state.ok || state.value.entries[0].appearance.color !== '#9aa99b' || !state.value.entries[0].appearance.cover || state.value.entries[1].appearance.color !== '#bd9da6') throw Error('Appearance was lost on restart');
    await until("document.querySelector('[data-testid=current-notebook-cover]')?.complete");
    if ((await run("document.querySelector('[data-testid=current-notebook-cover]').src")) !== expected.cover) throw Error('Persisted cover changed');
    writeFileSync(join(directory, 'appearance-reopen.json'), JSON.stringify({ persistedColor: true, persistedCover: true, headerThumbnail: true })); return;
  }
  let state = (await run('window.notebookAid.library.registry()')).value; const first = state.entries[0];
  if (first.appearance.color !== '#7460c9' || first.appearance.cover !== null) throw Error('Incorrect defaults');
  await until("!!document.querySelector('[data-testid=current-notebook-icon]')");
  const centered = await run("(()=>{const p=document.querySelector('[data-testid=current-notebook-identity]'),a=p.querySelector('svg').getBoundingClientRect(),b=p.querySelector('span').getBoundingClientRect();return Math.abs(a.top+a.height/2-b.top-b.height/2)<1;})()"); if (!centered) throw Error('Header icon is not vertically centered');
  await click('libraries-tab'); await run("document.querySelector('[data-testid=library-settings]').click()");
  await until(`document.querySelector('[data-testid=settings-library-select]')?.value==='${first.id}' && !!document.querySelector('[data-testid=notebook-appearance]')`);
  if (await run("document.querySelectorAll('[data-cover-preset]').length") !== 10) throw Error('Missing preset covers');
  if (await run("document.querySelectorAll('.notebook-swatch').length") !== 10) throw Error('Missing preset colors');
  for (let i = 0; i < 10; i++) {
    await run(`document.querySelectorAll('.notebook-swatch')[${i}].click()`);
    await until(`document.querySelectorAll('.notebook-swatch')[${i}].getAttribute('aria-pressed')==='true'`);
  }
  for (let i = 0; i < 10; i++) {
    await run(`document.querySelectorAll('[data-cover-preset]')[${i}].click()`);
    await until(`document.querySelectorAll('[data-cover-preset]')[${i}].getAttribute('aria-pressed')==='true' && !document.querySelector('[data-testid=notebook-appearance-save]').disabled`);
    if (!(await run("document.querySelector('app-notebook-appearance .notebook-cover img')?.src.startsWith('data:image/png;base64,')"))) throw Error('Preset did not render');
  }
  await run("const color=document.querySelector('[data-testid=notebook-color]');color.value='#9aa99b';color.dispatchEvent(new Event('input',{bubbles:true}));");
  await click('notebook-appearance-save'); await until("document.querySelector('[data-testid=notebook-appearance-result]')?.textContent.includes('已保存')");
  await until("!!document.querySelector('[data-testid=current-notebook-cover]')");
  const invalid = await run(`window.notebookAid.library.setNotebookAppearance('${first.id}',{version:1,color:'#9aa99b',cover:'https://example.invalid/cover.png'})`); if (invalid.ok || invalid.code !== 'INVALID_INPUT') throw Error('Unsafe cover accepted');
  writeFileSync(join(directory, 'cover-dialog.json'), JSON.stringify({ path: null }));
  const before = await run("document.querySelector('app-notebook-appearance .notebook-cover img').src"); await click('notebook-cover-choose'); await until("!document.querySelector('[data-testid=notebook-cover-choose]').disabled");
  if (await run("!!document.querySelector('[data-testid=cover-crop-dialog]')")) throw Error('Cancelled picker opened crop dialog');
  const sample = await run("(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='#a6b5ab';x.fillRect(0,0,1200,800);x.fillStyle='#e8dbbf';x.fillRect(400,100,250,250);return c.toDataURL('image/png');})()");
  const file = join(directory, 'local-cover.png'); writeFileSync(file, Buffer.from(sample.split(',')[1], 'base64')); writeFileSync(join(directory, 'cover-dialog.json'), JSON.stringify({ path: file }));
  await click('notebook-cover-choose'); await click('cover-crop-cancel'); await until("!document.querySelector('[data-testid=notebook-cover-choose]').disabled");
  if ((await run("document.querySelector('app-notebook-appearance .notebook-cover img').src")) !== before) throw Error('Cancelled crop changed cover');
  await click('notebook-cover-choose'); await until("document.querySelector('[data-testid=cover-crop-save]')?.disabled===false");
  await run("const zoom=document.querySelector('[data-testid=cover-zoom]');zoom.value='1.5';zoom.dispatchEvent(new Event('input',{bubbles:true}));const position=document.querySelector('[data-testid=cover-x]');position.value='35';position.dispatchEvent(new Event('input',{bubbles:true}));");
  await window.webContents.capturePage().then(image => writeFileSync(join(directory, 'cover-crop.png'), image.toPNG()));
  await click('cover-crop-save'); await click('notebook-appearance-save'); await until("document.querySelector('[data-testid=notebook-appearance-result]')?.textContent.includes('已保存')");
  const custom = (await run('window.notebookAid.library.registry()')).value.entries[0].appearance.cover;
  if (custom === before || Buffer.from(custom.split(',')[1], 'base64').readUInt32BE(16) !== 512) throw Error('Crop was not saved');
  writeFileSync(join(directory, 'simulate-appearance-failure'), '1'); await run("document.querySelectorAll('.notebook-swatch')[1].click()"); await click('notebook-appearance-save'); await until("document.querySelector('[data-testid=notebook-appearance-result]')?.textContent.includes('WRITE_FAILED')"); unlinkSync(join(directory, 'simulate-appearance-failure'));
  if ((await run('window.notebookAid.library.registry()')).value.entries[0].appearance.color !== '#9aa99b') throw Error('Failed save changed persisted color');
  await run("document.querySelectorAll('.notebook-swatch')[2].click()");
  await click('notebook-cover-remove'); await click('notebook-appearance-save'); await until("!!document.querySelector('[data-testid=current-notebook-icon]')");
  if (!(await run("getComputedStyle(document.querySelector('[data-testid=current-notebook-icon]')).color==='rgb(154, 169, 155)'"))) throw Error('Header icon color is wrong');
  await run("document.querySelector('[data-cover-preset=mountain-sun]').click()"); await until("!document.querySelector('[data-testid=notebook-appearance-save]').disabled"); await click('notebook-appearance-save'); await until("!!document.querySelector('[data-testid=current-notebook-cover]')");
  const secondPath = join(directory, 'second'); writeFileSync(join(directory, 'registry-dialog.json'), JSON.stringify({ path: secondPath })); const registered = await run("window.notebookAid.library.register('create')"); if (!registered.ok) throw Error('Could not register fixture notebook');
  const second = registered.value.entries[1]; await click('libraries-tab'); await click('library-refresh'); await until("document.querySelectorAll('[data-testid=library-entry]').length===2");
  await run(`document.querySelector('[data-library-id="${second.id}"] [data-testid=library-settings]').click()`); await until(`document.querySelector('[data-testid=settings-library-select]').value==='${second.id}'`);
  await run("document.querySelectorAll('.notebook-swatch')[1].click()"); await click('notebook-appearance-save'); await until("document.querySelector('[data-testid=notebook-appearance-result]')?.textContent.includes('已保存')");
  state = (await run('window.notebookAid.library.registry()')).value; if (state.activeId !== first.id || state.entries[0].appearance.color !== '#9aa99b' || state.entries[1].appearance.color !== '#bd9da6') throw Error('Editing another notebook affected current notebook');
  await click('libraries-tab'); await window.webContents.capturePage().then(image => writeFileSync(join(directory, 'notebook-cards.png'), image.toPNG()));
  await run(`document.querySelector('[data-library-id="${first.id}"] [data-testid=library-settings]').click()`); await until("!!document.querySelector('[data-testid=notebook-appearance]')");
  await until(`document.querySelector('app-settings').hidden===false && document.querySelector('[data-testid=settings-library-select]').value==='${first.id}' && document.querySelector('[data-testid=notebook-color]').value==='#9aa99b'`);
  await new Promise(resolve => setTimeout(resolve, 500));
  await window.webContents.capturePage().then(image => writeFileSync(join(directory, 'notebook-settings.png'), image.toPNG()));
  const beforeResize = await run('innerWidth');
  await run("window.notebookAid.library.updateSettings({theme:'dark'})"); await run("document.documentElement.dataset.theme='dark'"); window.unmaximize(); window.setSize(960, 700); await until(`innerWidth<${beforeResize}`); await new Promise(resolve => setTimeout(resolve, 1000));
  writeFileSync(join(directory, 'appearance-window.json'), JSON.stringify({ bounds: window.getBounds(), beforeResize, rendererWidth: await run('innerWidth') }));
  const fitting = await run("(()=>{const p=document.querySelector('app-notebook-appearance .panel').getBoundingClientRect();return [...document.querySelectorAll('[data-cover-preset]')].every(el=>{const b=el.getBoundingClientRect();return b.left>=p.left&&b.right<=p.right+1;});})()"); if (!fitting) throw Error('Narrow preset grid overflows');
  await window.webContents.capturePage().then(image => writeFileSync(join(directory, 'notebook-settings-dark-narrow.png'), image.toPNG()));
  await run("window.notebookAid.library.updateSettings({theme:'system'})");
  writeFileSync(join(directory, 'appearance-expected.json'), JSON.stringify({ cover: state.entries[0].appearance.cover }));
  writeFileSync(join(directory, 'appearance-report.json'), JSON.stringify({ defaults: true, iconCentered: true, tenPresets: true, nativePickerCancellation: true, cropCancellation: true, localCrop: true, unsafeCoverRejected: true, failureRetainsPrevious: true, coverRemovalFallback: true, notebookIsolation: true, narrowGrid: true }));
}
