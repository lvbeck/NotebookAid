const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
app.setPath('userData', path.resolve('output/notebook-icon-profile'));
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } }); await window.loadURL('about:blank');
  const svg = fs.readFileSync('assets/notebookaid-notebook.svg');
  const frames = await window.webContents.executeJavaScript(`(async()=>{const image=new Image();image.src='data:image/svg+xml;base64,${svg.toString('base64')}';await image.decode();return [16,20,24,32,40,48,64,128,256,512].map(size=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(image,0,0,size,size);return {size,png:canvas.toDataURL('image/png').split(',')[1]};});})()`);
  // Preserve the approved Windows ICO source asset.
  const types={16:'icp4',32:'icp5',64:'icp6',128:'ic07',256:'ic08',512:'ic09'}, chunks=[];
  for(const frame of frames){if(!types[frame.size])continue;const data=Buffer.from(frame.png,'base64'),chunk=Buffer.alloc(8);chunk.write(types[frame.size]);chunk.writeUInt32BE(data.length+8,4);chunks.push(chunk,data);}
  const icns=Buffer.alloc(8);icns.write('icns');icns.writeUInt32BE(8+chunks.reduce((size,chunk)=>size+chunk.length,0),4);fs.writeFileSync('assets/notebookaid-notebook.icns',Buffer.concat([icns,...chunks]));
  fs.writeFileSync('output/notebookaid-notebook.png',Buffer.from(frames.find(frame=>frame.size===256).png,'base64')); app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
