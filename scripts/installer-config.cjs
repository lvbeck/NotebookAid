module.exports = {
  appId: 'de.zub-systems.notebookaid', productName: 'NotebookAid',
  directories: { output: 'release/installer', buildResources: 'dist/installer-resources' },
  publish: null,
  fileAssociations: [{ ext: 'nabook', name: 'NotebookAid.NotebookArchive', description: 'NotebookAid Notebook Archive', role: 'Editor', icon: 'assets/notebookaid-notebook.ico' }],
  win: { target: [{ target: 'nsis', arch: ['x64'] }], icon: 'assets/notebookaid.ico', signAndEditExecutable: false },
  nsis: {
    uninstallDisplayName: 'NotebookAid',
    guid: '1585ae4a-41ea-4f85-aa30-75cf234c17ac',
    artifactName: 'NotebookAid-${version}-Setup-x64.exe',
    oneClick: false, perMachine: false, allowElevation: true,
    allowToChangeInstallationDirectory: true, displayLanguageSelector: true,
    installerLanguages: ['en_US', 'de_DE', 'fr_FR', 'it_IT', 'es_ES', 'pt_PT', 'zh_CN', 'zh_TW', 'ja_JP', 'ko_KR'],
    deleteAppDataOnUninstall: false, runAfterFinish: false,
    createDesktopShortcut: false, createStartMenuShortcut: false,
    installerSidebar: 'assets/installer-sidebar.bmp', uninstallerSidebar: 'assets/installer-sidebar.bmp',
    include: 'scripts/installer.nsh', license: 'LICENSE',
  },
};
const updateEnvironment = require('./github-update-config.cjs').windowsEnvironment();
const url = updateEnvironment.NOTEBOOKAID_UPDATE_URL;
if (url) {
  const address = new URL(url), publisher = updateEnvironment.NOTEBOOKAID_UPDATE_PUBLISHER;
  if (address.protocol !== 'https:' || address.username || address.password || !publisher?.trim()) throw Error('HTTPS update source and signing publisher are required.');
  module.exports.publish = { provider: 'generic', url };
  module.exports.forceCodeSigning = true;
  module.exports.win.signAndEditExecutable = true;
  module.exports.win.publisherName = publisher;
}
