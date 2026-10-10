const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const root = resolve('assets');
mkdirSync(root, { recursive: true });
app.setPath('userData', resolve('output/icon-render-profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await win.loadURL('about:blank');
  const svg = readFileSync(join(root, 'notebookaid.svg'), 'utf8');
  const result = await win.webContents.executeJavaScript(`(async () => {
    const image = new Image();
    image.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
    await image.decode();
    return [16, 20, 24, 32, 40, 48, 64, 128, 256, 512].map(size => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(image, 0, 0, size, size);
      return { size, png: canvas.toDataURL('image/png').split(',')[1] };
    });
  })()`);
  const frames = result.map(({ size, png }) => ({ size, data: Buffer.from(png, 'base64') }));
  for (const frame of frames) writeFileSync(join(root, `notebookaid-${frame.size}.png`), frame.data);
  const addonIcons = resolve('thunderbird/icons');
  mkdirSync(addonIcons, { recursive: true });
  for (const frame of frames.filter(frame => [16, 32, 48, 64, 128].includes(frame.size))) {
    writeFileSync(join(addonIcons, `notebookaid-${frame.size}.png`), frame.data);
  }
  const icons = frames.filter(frame => frame.size <= 256);
  const header = Buffer.alloc(6 + icons.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(icons.length, 4);
  let offset = header.length;
  icons.forEach((frame, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = frame.size === 256 ? 0 : frame.size;
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.data.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
    offset += frame.data.length;
  });
  writeFileSync(join(root, 'notebookaid.ico'), Buffer.concat([header, ...icons.map(frame => frame.data)]));
  console.log('Rendered PNG sizes and Windows ICO');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
