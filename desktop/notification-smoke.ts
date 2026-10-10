import type { BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export async function smokeNotifications(window: BrowserWindow, directory: string): Promise<void> {
  const evaluate = async (script: string) => {
    try { return await window.webContents.executeJavaScript(script); }
    catch { throw new Error('Notification script failed: ' + script); }
  };
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (expression: string) => { for (let n = 0; n < 120; n++) { if (await evaluate(expression)) return; await wait(100); } throw new Error('Notification UI timed out: ' + expression); };
  const click = (selector: string) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const select = (selector: string, value: string) => evaluate(`(() => {const element=document.querySelector(${JSON.stringify(selector)});element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const capture = async (name: string) => { await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); await window.webContents.capturePage(); await wait(250); writeFileSync(join(directory, name), (await window.webContents.capturePage()).toPNG()); };
  const state = () => evaluate('(async()=>{const result=await window.notebookAid.notifications.state();if(!result.ok)throw Error(result.code);return result.value;})()');
  const before = await state();
  if (!before.records.some((item: any) => item.code === 'saveSuccess') || !before.records.some((item: any) => item.code === 'operationFailed')) throw new Error('Operation history missing');
  const invalid = await evaluate("window.notebookAid.notifications.publish({code:'saveSuccess',operation:'save',body:'PRIVATE BODY'})");
  if (invalid.ok || invalid.code !== 'INVALID_INPUT') throw new Error('Private payload accepted');

  await evaluate("document.querySelector('[data-testid=notifications-bell]').focus()"); await click('[data-testid=notifications-bell]');
  await until("!!document.querySelector('[data-testid=notification-history]') && document.querySelector('[data-testid=notification-history]').contains(document.activeElement)");
  if (!await evaluate("document.querySelector('.app-shell').inert && document.querySelectorAll('[data-testid=notification-record]').length > 0")) throw new Error('History focus/isolation failed');
  await capture('notifications-history-dark.png');
  const unreadBefore = (await state()).records.filter((item: any) => !item.read).length;
  if (before.records.some((item: any) => item.type === 'success' && !item.read)) throw new Error('Success contributed to unread history');
  await until(`Number(document.querySelector('.notification-badge')?.textContent || 0) === ${unreadBefore}`);
  await click('[data-testid=notification-read]');
  await until(`document.querySelectorAll('.notification-history-item.unread').length === ${unreadBefore - 1}`);
  await click('[data-testid=notifications-read-all]'); await until("!document.querySelector('.notification-badge')");
  await click('[data-testid=notifications-unread]'); await until("document.querySelectorAll('[data-testid=notification-record]').length === 0");
  await click('[data-testid=notifications-unread]');
  await select('[data-testid=notifications-type]', 'error');
  await until("document.querySelectorAll('[data-testid=notification-record]').length > 0 && [...document.querySelectorAll('[data-testid=notification-record]')].every(item=>item.dataset.type==='error')");
  await select('[data-testid=notifications-type]', 'all');
  await select('[data-testid=notifications-library]', 'global');
  await until("document.querySelectorAll('[data-testid=notification-record]').length > 0 && [...document.querySelectorAll('.notification-library')].every(item=>item.textContent==='应用')");
  await select('[data-testid=notifications-library]', 'all');
  await until("document.querySelectorAll('[data-testid=notification-record]').length > 1");
  const count = (await state()).records.length; await click('[data-testid=notification-remove]');
  await until(`document.querySelectorAll('[data-testid=notification-record]').length === ${count - 1}`);
  await click('[data-testid=notifications-clear]');
  if ((await state()).records.length !== count - 1) throw new Error('Clear skipped confirmation');
  await click('[data-testid=notifications-clear-confirm]'); await until("document.querySelectorAll('[data-testid=notification-record]').length === 0");
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  await until("!document.querySelector('[data-testid=notification-history]') && document.activeElement?.dataset.testid === 'notifications-bell'");

  await select('[data-testid=theme]', 'light');
  await click('[data-testid=settings-tab]');
  for (const position of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    await until("!document.querySelector('[data-testid=notification-position]').disabled");
    await select('[data-testid=notification-position]', position);
    await until(`document.querySelector('[data-testid=notification-position]').value === '${position}' && !document.querySelector('[data-testid=notification-position]').disabled`);
    await click('[data-testid=save-note]');
    await until("!!document.querySelector('[data-testid=notification][data-code=saveSuccess]')");
    const placed = await evaluate(`(() => {const r=document.querySelector('.notification-overlay').getBoundingClientRect();return ${position.endsWith('left') ? 'Math.abs(r.left-20)<3' : 'Math.abs(innerWidth-r.right-20)<3'} && ${position.startsWith('top') ? 'Math.abs(r.top-20)<3' : 'Math.abs(innerHeight-r.bottom-20)<3'};})()`);
    if (!placed) throw new Error('Popup position incorrect: ' + position);
  }
  if (!await evaluate("document.querySelectorAll('[data-testid=notification]').length <= 3")) throw new Error('Too many simultaneous cards');
  await capture('notifications-toast-light.png');
  // A failed history write must not alter the actual note save result.
  writeFileSync(join(directory, 'simulate-notification-failure'), 'self-test');
  await evaluate("(() => {const title=document.querySelector('[data-testid=note-title]');title.value='消息存储失败仍保存';title.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await click('[data-testid=save-note]');
  await until("document.querySelector('[data-testid=save-status]').textContent.includes('已保存') && document.body.textContent.includes('消息历史暂不可用')");
  const notes = await evaluate('window.notebookAid.library.list()');
  if (!notes.ok || notes.value[0].title !== '消息存储失败仍保存') throw new Error('History failure blocked note saving');
  unlinkSync(join(directory, 'simulate-notification-failure'));
  await click('[data-testid=notifications-bell]'); await until("!!document.querySelector('[data-testid=notification-history]')");
  await until("!document.querySelector('.library-warning')?.textContent.includes('消息历史暂不可用')");
  await click('.notification-drawer-header .icon-button');
  // Drive persistent error cards without adding another note revision.
  writeFileSync(join(directory, 'simulate-write-failure'), 'self-test');
  await evaluate("(() => {const title=document.querySelector('[data-testid=note-title]');title.value='待恢复草稿';title.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await click('[data-testid=save-note]'); await until("!!document.querySelector('[data-testid=notification][data-type=error]')");
  await click('[data-testid=save-note]');
  await until("[...document.querySelectorAll('[data-testid=notification]')].some(item=>item.textContent.includes('累计次数： 2'))");
  unlinkSync(join(directory, 'simulate-write-failure'));
  await evaluate("(() => {const title=document.querySelector('[data-testid=note-title]');title.value='消息存储失败仍保存';title.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await evaluate("document.querySelectorAll('[data-testid=notification]:not([data-type=error]) .icon-button').forEach(button=>button.click())");
  await until("!document.querySelector('[data-testid=notification][data-code=saveSuccess]')");
  await click('[data-testid=save-note]');
  await until("!!document.querySelector('[data-testid=notification][data-code=saveSuccess]')");
  await evaluate("document.querySelector('[data-testid=notification][data-code=saveSuccess]').dispatchEvent(new MouseEvent('mouseenter'))");
  await wait(4500);
  if (!await evaluate("!!document.querySelector('[data-testid=notification][data-code=saveSuccess]')")) throw new Error('Hover did not pause timeout');
  // Hidden test windows do not emit native focus events, so exercise the handlers explicitly.
  await evaluate("const card=document.querySelector('[data-testid=notification][data-code=saveSuccess]');card.querySelector('button').focus();card.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));card.dispatchEvent(new MouseEvent('mouseleave'))");
  if (!await evaluate("document.querySelector('[data-testid=notification][data-code=saveSuccess]').contains(document.activeElement)")) throw new Error('Card did not receive focus: ' + await evaluate('document.activeElement.outerHTML'));
  await wait(4500);
  if (!await evaluate("!!document.querySelector('[data-testid=notification][data-code=saveSuccess]')")) throw new Error('Focus handler did not pause timeout');
  await evaluate("const bell=document.querySelector('[data-testid=notifications-bell]');bell.focus();document.querySelector('[data-testid=notification][data-code=saveSuccess]').dispatchEvent(new FocusEvent('focusout',{bubbles:true,relatedTarget:bell}))");
  await until("!document.querySelector('[data-testid=notification][data-code=saveSuccess]')");
  if (!await evaluate("!!document.querySelector('[data-testid=notification][data-type=error]')")) throw new Error('Error card expired automatically');
  const retainedCount = (await state()).records.length;
  await click('[data-testid=notification][data-type=error] .icon-button');
  if ((await state()).records.length !== retainedCount) throw new Error('Dismiss removed history');
  await select('[data-testid=notification-position]', 'top-left');
  await until("!document.querySelector('[data-testid=notification-position]').disabled && document.querySelector('[data-testid=notification-position]').value === 'top-left'");
  await click('[data-testid=notifications-bell]'); await until("!!document.querySelector('[data-testid=notification-history]')");
  await capture('notifications-history-light.png');
  await click('[data-testid=notifications-read-all]'); await until("!document.querySelector('.notification-badge')");
  await click('.notification-drawer-header .icon-button');
  const final = await state();
  if (final.records.some((item: any) => item.type === 'success' && !item.read)) throw new Error('Merged success became unread');
  writeFileSync(join(directory, 'notification-expected.json'), JSON.stringify(final));
  writeFileSync(join(directory, 'notification-report.json'), JSON.stringify({ historyManagement: true, filters: true, fourPositions: true, focusAndEscape: true, hoverPauseSimulatedEvent: true, focusPauseSimulatedEvent: true, errorDoesNotExpire: true, errorAggregation: true, dismissalRetainsHistory: true, historyFailureDoesNotBlockSave: true, privatePayloadRejected: true, records: final.records.length, position: final.position }, null, 2));
}
