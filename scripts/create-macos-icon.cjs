const fs = require('node:fs');
const chunks = [];
for (const [size, type] of [[16, 'icp4'], [32, 'icp5'], [64, 'icp6'], [128, 'ic07'], [256, 'ic08'], [512, 'ic09']]) {
  const png = fs.readFileSync(`assets/notebookaid-${size}.png`), header = Buffer.alloc(8);
  header.write(type); header.writeUInt32BE(png.length + 8, 4); chunks.push(header, png);
}
const header = Buffer.alloc(8); header.write('icns'); header.writeUInt32BE(chunks.reduce((sum, chunk) => sum + chunk.length, 8), 4);
fs.writeFileSync('assets/notebookaid.icns', Buffer.concat([header, ...chunks]));
