// Static guards for the "no horizontal scroll / never dim content" rules. The runtime check (scrollWidth <= clientWidth at 1280x800 and 1920x1080,
// EN + HE, all 11 palettes, contrast >= 4.5 and no opacity / overlay in the busy state) is scripts/check-layout.cjs (needs the Electron app).
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..'); const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const css = rd('src/styles/wizard.css'), tsx = rd('src/checklist/ChecklistSummary.tsx');

test('summary table: auto layout sized from the content, one line per item, N items fallback instead of wrapping, no scroll wrapper', () => {
  assert.ok(/\.qr-cks-tab\s*\{[^}]*table-layout:\s*auto/.test(css));
  assert.ok(!/qr-cks-scroll/.test(css) && !/qr-cks-scroll/.test(tsx));
  assert.ok(/\.qr-cks-tab th, \.qr-cks-tab td\s*\{[^}]*white-space:\s*nowrap/.test(css), 'cells nowrap');
  assert.ok(/\.qr-cks-t\s*\{[^}]*display:\s*block;\s*white-space:\s*nowrap/.test(css), 'each item on its own line, never wraps inside');
  assert.ok(/ck\.items\.many/.test(tsx) && /materialShort/.test(tsx), 'N items fallback + trimmed material');
  assert.ok(!/min-width:\s*\d+px/.test(css.slice(css.indexOf('.qr-cks-card'), css.indexOf('/* No horizontal'))), 'no fixed min widths in the summary table block');
});
test('summary table: Precision and Complexity come right after the part; table font is a token; card sits on a surface', () => {
  const head = tsx.match(/<thead>.*<\/thead>/)[0]; assert.ok(head.indexOf('ck.col.part') < head.indexOf('ck.prec.title') && head.indexOf('ck.prec.title') < head.indexOf('ck.cx.title') && head.indexOf('ck.cx.title') < head.indexOf('GROUPS.map'));
  assert.ok(/\.qr-cks-tab\s*\{[^}]*font-size:\s*var\(--qr-fs-sm\)/.test(css));
  assert.ok(/\.qr-cks-card\s*\{[^}]*background:\s*var\(--mrt-surface\)[^}]*color:\s*var\(--mrt-text\)/.test(css));
});
test('never dim content: no opacity rules on the provisional / busy state; busy is a small corner toast', () => {
  assert.ok(!/data-provisional[^{]*\{[^}]*opacity/.test(css));
  assert.ok(!/\.qr-cks[^{]*\{[^}]*opacity/.test(css));
  const q = rd('src/styles/qr.css'); const busy = q.match(/\.qr-busy\s*\{[^}]*\}/)[0]; assert.ok(/position:\s*fixed/.test(busy) && /bottom:/.test(busy) && !/inset:\s*0\b/.test(busy) && !/\b(width|height):\s*100/.test(busy));
  assert.ok(!/\.qr-(proj|wiz|summary-step|sum-wrap)[^{]*\{[^}]*(opacity|filter)\s*:/.test(rd('src/styles/layers.css') + css));
});
test('tables in QR wrap instead of scrolling horizontally', () => {
  assert.ok(/\.qr-root \.qr-table[^{]*\{[^}]*table-layout:\s*fixed/.test(css));
  assert.ok(/qr-summary-step[^{]*\{[^}]*overflow-x:\s*hidden/.test(css));
});
test('summary short labels exist in EN and HE', () => {
  const en = JSON.parse(rd('src/i18n/en.json')), he = JSON.parse(rd('src/i18n/he.json'));
  for (const id of ['heat', 'engrave', 'laser', 'engfill', 'threads', 'gauges', 'tight', 'coating', 'paint', 'br127', 'assembly', 'inspect100', 'cleanroom']) { assert.ok(en['ck.s.' + id], id); assert.ok(he['ck.s.' + id], id); }
});
