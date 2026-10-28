'use strict';
// WCAG AA on the theme tokens and on hard-coded text colours: text vs its background >= 4.5:1, status dots >= 3:1.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const S = path.join(__dirname, '..', 'src', 'styles'); const rd = (f) => fs.readFileSync(path.join(S, f), 'utf8');
function tokens(...files) { const t = {}; for (const f of files) for (const m of rd(f).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) t[m[1]] = m[2].trim(); return t; }
const T = tokens('qrPalette.css', 'buttons.css');
function parse(v, bg) {
  v = String(v).trim();
  let m = v.match(/^var\((--[a-z0-9-]+)\)$/i); if (m) { assert.ok(T[m[1]], 'unknown token ' + m[1]); return parse(T[m[1]], bg); }
  m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); const a = p.length > 3 ? p[3] : 1; const b = bg || [255, 255, 255]; return [0, 1, 2].map((i) => Math.round(p[i] * a + b[i] * (1 - a))); }
  throw new Error('cannot parse colour: ' + v);
}
const lum = (c) => { const f = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const WHITE = [255, 255, 255];
const surfaces = ['--mrt-surface', '--mrt-surface-muted', '--mrt-header-bg', '--qr-rail-bg', '--mrt-btn-neutral-fill', '--qr-disabled-bg'];
test('text tokens are >= 4.5:1 on every surface', () => {
  const bad = [];
  for (const fg of ['--mrt-text', '--mrt-text-muted', '--qr-ok-text', '--qr-warn-text', '--qr-bad-text', '--mrt-accent'])
    for (const bg of surfaces) { const r = ratio(parse('var(' + fg + ')'), parse('var(' + bg + ')')); if (r < 4.5) bad.push(`${fg} on ${bg}: ${r.toFixed(2)}`); }
  assert.deepStrictEqual(bad, []);
});
test('button text/background pairs, including hover and disabled, are >= 4.5:1', () => {
  const P = [['--qr-btn-fg', '--qr-btn-bg'], ['--qr-btn-fg', '--qr-btn-bg-hover'], ['--qr-btn-primary-fg', '--qr-btn-primary-bg'], ['--qr-btn-primary-fg', '--qr-btn-primary-bg-hover'],
    ['--qr-btn-disabled-fg', '--qr-btn-disabled-bg'], ['--qr-disabled-fg', '--qr-disabled-bg'], ['--mrt-btn-secondary-fg', '--mrt-btn-neutral-fill'], ['--mrt-btn-secondary-fg', '--mrt-btn-neutral-fill-hover']];
  const bad = P.filter(([f, b]) => ratio(parse('var(' + f + ')'), parse('var(' + b + ')')) < 4.5).map((p) => p.join(' on ') + ': ' + ratio(parse('var(' + p[0] + ')'), parse('var(' + p[1] + ')')).toFixed(2));
  assert.deepStrictEqual(bad, []);
  assert.strictEqual(T['--qr-btn-disabled-opacity'], '1', 'disabled controls must not fade below AA with opacity');
});
test('status dots and button borders are >= 3:1 on white (non-text contrast)', () => {
  const bad = [];
  for (const k of ['--qr-st-ok', '--qr-st-warn', '--qr-st-bad']) { const r = ratio(parse('var(' + k + ')'), WHITE); if (r < 3) bad.push(k + ' ' + r.toFixed(2)); }
  const st = ratio(parse('var(--qr-st-none)'), WHITE); if (st < 3) bad.push('--qr-st-none ' + st.toFixed(2));
  const bd = ratio(parse(T['--qr-btn-border'], WHITE), WHITE); if (bd < 3) bad.push('--qr-btn-border ' + bd.toFixed(2));
  assert.deepStrictEqual(bad, []);
});
test('surfaces are light: no grey-on-grey (surfaces differ from text by >= 12:1 and the wizard surfaces are near-white)', () => {
  for (const s of surfaces) assert.ok(lum(parse('var(' + s + ')')) > 0.88, s + ' must be very light');
  assert.ok(ratio(parse('var(--mrt-text)'), parse('var(--mrt-surface-muted)')) >= 12);
});
test('hard-coded text colours in QR css are readable on the lightest-dark surface (#f5f5f7) or on their own background', () => {
  const bad = [];
  for (const f of ['qr.css', 'wizard.css', 'system.css', 'surface.css', 'groups.css', 'history.css', 'tour.css', 'fit.css', 'type.css']) {
    const css = rd(f).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].trim().replace(/\s+/g, ' ').slice(0, 60); const body = m[2];
      const col = body.match(/(?:^|[;\s])color:\s*(#[0-9a-f]{3,6})\b/i); if (!col) continue;
      const fg = parse(col[1]); const own = body.match(/background(?:-color)?:\s*(#[0-9a-f]{3,6})\b/i);
      const bg = own ? parse(own[1]) : parse('#f5f5f7');
      if (!own && lum(fg) > 0.7) continue; // light text is for a dark surface defined elsewhere (toast, busy bar)
      const r = ratio(fg, bg); if (r < 4.5) bad.push(`${f} ${sel}: ${col[1]} on ${own ? own[1] : '#f5f5f7'} = ${r.toFixed(2)}`);
    }
  }
  assert.deepStrictEqual(bad, []);
});
test('app uses the light palette and the palette selector beats the MRT preset blocks', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8'), /data-mrt-palette="light"/);
  assert.match(rd('qrPalette.css'), /\.qr-root\[data-mrt-palette\]\[data-mrt-theme\]\s*\{/);
});
