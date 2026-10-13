async function migrateLegacyPreferences() {
  const current = await browser.storage.local.get('profileId'); if (current.profileId) return;
  try {
    const previous = await browser.runtime.sendMessage('notebookaid-t02@zub-systems.de', { type: 'notebookaid-migrate-state' });
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (previous?.version !== 1 || !uuid.test(previous.profileId) || !Array.isArray(previous.mappedLibraries) || previous.mappedLibraries.length > 1000 || previous.mappedLibraries.some(id => typeof id !== 'string' || !uuid.test(id))) return;
    await browser.storage.local.set({ profileId: previous.profileId, mappedLibraries: [...new Set(previous.mappedLibraries)] });
  } catch { /* An uninstalled helper never causes automatic imports or data deletion. */ }
}
const migrationReady = migrateLegacyPreferences();
const host = 'de.zub_systems.notebookaid';
const protocolVersion = 1;
let spacePromise;
async function space() {
  const spaces = await browser.spaces.query({ name: 'NotebookAid', isSelfOwned: true });
  return spaces[0] || browser.spaces.create('NotebookAid', { url: browser.runtime.getURL('notes.html') }, { title: 'NotebookAid', defaultIcons: 'icons/notebookaid-32.png' });
}
spacePromise = space();
browser.browserAction.onClicked.addListener(async () => { try { const current = await spacePromise; await browser.spaces.open(current.id); } catch { spacePromise = space(); const current = await spacePromise; await browser.spaces.open(current.id); } });
browser.runtime.onMessage.addListener(async (request, sender) => {
  if (sender.id !== browser.runtime.id || sender.url !== browser.runtime.getURL('notes.html')) return { ok: false, code: 'INVALID_INPUT' };
  if (request?.type === 'localTags') {
    await migrationReady;
    let { profileId } = await browser.storage.local.get('profileId');
    if (!profileId) { profileId = crypto.randomUUID(); await browser.storage.local.set({ profileId }); }
    const tags = await browser.messages.tags.list(); return { profileId, tags: tags.map(t => ({ key: t.key, name: t.tag, color: t.color || '#7460c9' })) };
  }
  if (request?.type !== 'native' || !['handshake','query','organization','preview','image','trash','openNote','mapTags','changes','start','open'].includes(request.method)) return { ok: false, code: 'INVALID_INPUT' };
  try { return await browser.runtime.sendNativeMessage(host, { method: request.method, protocolVersion, libraryId: request.libraryId, params: request.params }); }
  catch { return { ok: false, code: 'NATIVE_HOST_UNAVAILABLE' }; }
});

for (const name of ["onCreated","onUpdated","onDeleted"]) browser.messages.tags[name].addListener(() => { void browser.runtime.sendMessage({ type: "tagsChanged" }).catch(() => {}); });
