browser.runtime.onMessageExternal.addListener(async (request, sender) => {
  if (sender.id !== 'notebookaid@zub-systems.de' || request?.type !== 'notebookaid-migrate-state') return undefined;
  const { profileId, mappedLibraries } = await browser.storage.local.get(['profileId','mappedLibraries']);
  return { version: 1, profileId, mappedLibraries: mappedLibraries || [] };
});
