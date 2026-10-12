const fs = require('node:fs'), path = require('node:path');
const covers = [
  ['mountain-sun', '#ded8db', '#b5c1b8', '#e9d9be', 370, 130, ['#a7afb0', '#8b9f95', '#617e75'], ['M0 335 126 157 260 322 380 211 512 340V512H0Z', 'M0 393 138 304 256 411 399 285 512 400V512H0Z', 'M0 440Q130 354 263 428T512 388V512H0Z']],
  ['mist-lake', '#d8e1e1', '#b7cbd0', '#ede5d4', 354, 108, ['#b4c0c1', '#8fa8a6', '#738f9b'], ['M0 260Q90 100 190 256T390 240T512 260V512H0Z', 'M0 320Q130 244 268 311T512 296V512H0Z', 'M0 365Q220 345 512 372V512H0Z']],
  ['rose-dunes', '#ecded9', '#c9b0a5', '#f0d1ab', 148, 119, ['#d4b5ad', '#be9992', '#a97f7a'], ['M0 280Q166 173 330 292T512 263V512H0Z', 'M0 364Q211 229 512 359V512H0Z', 'M0 456Q168 335 512 430V512H0Z']],
  ['sage-hills', '#e1e2d7', '#bac4ae', '#eee4c9', 382, 135, ['#b1bca5', '#94a58c', '#758d79'], ['M0 300Q103 182 232 308T512 277V512H0Z', 'M0 371Q189 237 365 361T512 338V512H0Z', 'M0 443Q207 347 512 425V512H0Z']],
  ['lavender-dusk', '#dcd7e6', '#aba4bc', '#e9dbd5', 339, 109, ['#b8adca', '#968cae', '#776f91'], ['M0 315 108 190 250 321 393 176 512 305V512H0Z', 'M0 378Q118 283 304 380T512 313V512H0Z', 'M0 459Q200 362 512 423V512H0Z']],
  ['coastal-morning', '#dae4e1', '#a9c0be', '#efdebf', 352, 138, ['#afc8c5', '#91afad', '#d8c7ab'], ['M0 280Q230 265 512 286V512H0Z', 'M0 344Q256 315 512 350V512H0Z', 'M0 512V440Q195 401 292 420T512 391V512Z']],
  ['snow-peaks', '#dbe1e5', '#bcc9d0', '#e9e3d3', 384, 119, ['#b1bec8', '#91a6b6', '#758e9d'], ['M0 337 154 143 310 340 421 212 512 326V512H0Z', 'M0 425 110 281 246 408 343 281 512 403V512H0Z', 'M0 459Q223 370 512 455V512H0Z']],
  ['amber-valley', '#e6dbc9', '#bfb29c', '#edc796', 177, 126, ['#c9b796', '#af9b7c', '#8a856e'], ['M0 288 144 204 256 320 432 189 512 280V512H0Z', 'M0 362Q185 261 345 365T512 339V512H0Z', 'M0 442Q162 372 260 421T512 404V512H0Z']],
  ['moonlit-ridge', '#818997', '#565f75', '#e0d9c8', 367, 126, ['#768398', '#5f7288', '#425c6c'], ['M0 324 96 212 228 337 358 214 512 330V512H0Z', 'M0 404Q102 303 287 387T512 335V512H0Z', 'M0 455Q177 378 512 437V512H0Z']],
  ['quiet-forest', '#d4ded7', '#9cac9e', '#e6ddc3', 327, 121, ['#a6b7a5', '#819e8c', '#5e8074'], ['M0 302Q181 179 329 287T512 249V512H0Z', 'M0 397 34 312 64 397 102 270 145 397 197 288 244 397 296 272 345 397 394 299 445 397 484 279 512 397V512H0Z', 'M0 452Q200 351 512 422V512H0Z']]
];
const folder = path.resolve('assets/notebook-covers'); fs.mkdirSync(folder, { recursive: true });
for (const [name, top, bottom, sun, x, y, colors, shapes] of covers) {
  const extra = name === 'snow-peaks' ? '<path d="m154 143-40 51 38-12 29 15 28-5Z" fill="#e5e7e5"/>' : name === 'mist-lake' ? '<path d="M185 397h144M221 414h72M244 431h31" fill="none" stroke="#dee6e3" stroke-width="3" opacity=".6"/>' : name === 'moonlit-ridge' ? '<g fill="#e0d9c8" opacity=".7"><circle cx="99" cy="84" r="2"/><circle cx="225" cy="157" r="2"/><circle cx="289" cy="58" r="2"/></g>' : '';
  fs.writeFileSync(path.join(folder, name + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h512v512H0z"/><circle cx="${x}" cy="${y}" r="42" fill="${sun}"/>${shapes.map((d, i) => `<path d="${d}" fill="${colors[i]}"/>`).join('')}${extra}</svg>\n`);
}
console.log('Created ten original notebook covers.');
