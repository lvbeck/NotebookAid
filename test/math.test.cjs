const {test}=require('node:test'),assert=require('node:assert/strict');
const {mathAtStart,formulaSource,mathMarkup,formulaLimit}=require('../dist/runtime/shared/math-source');
const {formulaHtml}=require('../dist/runtime/shared/math-render');
const {mathPrintStyles}=require('../dist/runtime/desktop/math-print-assets');

test('math delimiters preserve source and distinguish currency, escapes and block boundaries',()=>{
  for(const source of ['$E=mc^2$',String.raw`\(a+b\)`,'$$\nf(x)=x^2\n$$',String.raw`\[\frac{1}{2}\]`]){
    const value=formulaSource(source);assert(value,source);assert.equal(value.source,source);assert(formulaHtml(source).includes('katex'));
  }
  assert.equal(formulaSource('$5 and $10'),undefined);
  assert.equal(mathAtStart('$5 and $10; $x$',false),undefined);
  assert.equal(mathAtStart('$$x$$\r\nTail',true).raw,'$$x$$\r\n');
  assert.equal(formulaSource('$ spaced $'),undefined);
  assert.equal(formulaSource('$a\nb$'),undefined);
  assert.equal(formulaSource('$$ missing'),undefined);
  assert.equal(mathAtStart('$$x$$ tail',true),undefined);
  assert.equal(mathAtStart('$$x$$\nTail',true).raw,'$$x$$\n');
  assert.equal(formulaSource(String.raw`$a\$b$`).latex,String.raw`a\$b`);
  assert.equal(formulaSource(String.raw`\(\begin{matrix}a&b\\c&d\end{matrix}\)`).display,false);
});

test('formula rendering is bounded, isolates macros and cannot create active content or requests',()=>{
  assert.throws(()=>formulaHtml('$'+('x'.repeat(formulaLimit))+'$'));
  assert.throws(()=>formulaHtml(String.raw`$\def\a{\a}\a$`));
  formulaHtml(String.raw`$\gdef\private{42}\private$`);
  assert.throws(()=>formulaHtml(String.raw`$\private$`));
  for(const source of [String.raw`$\href{javascript:alert(1)}{x}$`,String.raw`$\includegraphics{https://example.invalid/private}$`,String.raw`$\htmlStyle{background:url(https://example.invalid)}{x}$`]) {
    const html=formulaHtml(source);assert(!/<(?:script|img|iframe)\b|\shref=|\ssrc=|style="[^"<>]*(?:url|expression)/i.test(html));
  }
  assert.throws(()=>formulaHtml('$\\unknownCommand$'));
  assert(!mathMarkup('$"<&\n$',false).includes('data-note-math="$"'));
});

test('print math styles embed only shipped fonts and have no file or network references',()=>{
  const css=mathPrintStyles();assert(css.includes('data:font/woff2;base64,'));
  assert(!/url\((?!data:font\/woff2;base64,)/.test(css));
  assert.equal(mathPrintStyles(),css);
});
