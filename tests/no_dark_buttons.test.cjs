'use strict';
// Lint: no dark/charcoal button fills in QR's own CSS ("MRT doesn't want blackness"); sizes are px-capped.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'styles');
const OWN = fs.readdirSync(dir).filter((f) => f.endsWith('.css') && f !== 'mrtLiquidGlass.css');
const lum = (hex) => { let h = hex.slice(1); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function darkFills(css) {
  const out = []; const vars = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map((m) => [m[1], m[2]]));
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1]; if (!/button|btn|qr-blue/i.test(sel) || /topbar-cmd\[data-active/.test(sel)) continue;
    for (const d of m[2].matchAll(/background(?:-color)?:\s*([^;!]+)/g)) {
      const v = d[1].trim(); const hex = (v.match(/^#[0-9a-f]{3,6}\b/i) || [])[0] || vars[(v.match(/var\((--[\w-]+)/) || [])[1]];
      if (hex && lum(hex) < 0.6) out.push(sel.trim() + ' -> ' + v);
    }
  }
  for (const [k, v] of Object.entries(vars)) if (/btn.*bg/.test(k) && lum(v) < 0.6) out.push(k + ' ' + v);
  return out;
}
test('no dark button backgrounds in QR CSS', () => { for (const f of OWN) assert.deepStrictEqual(darkFills(fs.readFileSync(path.join(dir, f), 'utf8')), [], f); });
test('lint catches a dark fill', () => assert.strictEqual(darkFills('.qr-btn{background:#334155}').length, 1));
test('button size is px (does not scale with the text-size setting)', () => {
  const css = fs.readFileSync(path.join(dir, 'buttons.css'), 'utf8');
  for (const k of ['h', 'pad-x', 'fs']) assert.match(css, new RegExp(`--qr-btn-${k}:\\s*\\d+px;`), k);
});
