'use strict';
// WCAG AA on the theme tokens and on hard-coded text colours: text vs its background >= 4.5:1, status dots >= 3:1.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const S = path.join(__dirname, '..', 'src', 'styles'); const rd = (f) => fs.readFileSync(path.join(S, f), 'utf8');
function tokens(...files) { const t = {}; for (const f of files) for (const m of rd(f).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) t[m[1]] = m[2].trim(); return t; }
const PALETTES = ['aris-glass', 'icloud-windows', 'cleanmymac', 'priority-erp', 'industrial-steel', 'graphite', 'warm-neutral', 'soft-salad', 'soft-beige', 'soft-olive-gray', 'high-contrast']; const ACCENTS = ['slate', 'blue', 'teal', 'amber']; const DARK = ['graphite'];
// Resolve the token set of one theme exactly like the cascade does: buttons.css :root, qrPalette.css light base, then the rules of themes.css that match, in source order.
function resolve(palette, accent) {
  const dark = DARK.includes(palette); const t = { ...tokens('buttons.css') };
  const apply = (css) => { for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1]; const pal = sel.match(/data-qr-palette='([a-z-]+)'/); const th = sel.match(/data-mrt-theme='([a-z]+)'/); const acc = sel.match(/data-qr-accent='([a-z]+)'/);
    if (pal && pal[1] !== palette) continue; if (th && th[1] !== (dark ? 'dark' : 'light')) continue; if (acc && acc[1] !== accent) continue;
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) t[d[1]] = d[2].trim(); } };
  apply(rd('qrPalette.css')); apply(rd('themes.css')); return t;
}
const THEMES = []; for (const p of PALETTES) for (const a of ACCENTS) THEMES.push({ p, a, dark: DARK.includes(p), id: p + '/' + a, T: resolve(p, a) });
function parse(v, bg, T) {
  v = String(v).trim();
  let m = v.match(/^var\((--[a-z0-9-]+)\)$/i); if (m) { assert.ok(T[m[1]], 'unknown token ' + m[1]); return parse(T[m[1]], bg, T); }
  m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); const a = p.length > 3 ? p[3] : 1; const b = bg || [255, 255, 255]; return [0, 1, 2].map((i) => Math.round(p[i] * a + b[i] * (1 - a))); }
  throw new Error('cannot parse colour: ' + v);
}
const lum = (c) => { const f = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const col = (th, k, bg) => parse('var(' + k + ')', bg, th.T);
const surf = ['--mrt-surface', '--mrt-surface-muted', '--mrt-header-bg', '--qr-rail-bg', '--mrt-bg'];
test('every theme x accent resolves all tokens it needs', () => {
  for (const th of THEMES) for (const k of [...surf, '--mrt-text', '--mrt-text-muted', '--mrt-accent', '--qr-btn-bg', '--qr-btn-fg', '--qr-st-ok', '--qr-input-border']) assert.ok(th.T[k], th.id + ' lacks ' + k);
});
test('text tokens are >= 4.5:1 on every surface and on the canvas, in every theme and accent', () => {
  const bad = [];
  for (const th of THEMES) for (const fg of ['--mrt-text', '--mrt-text-muted', '--qr-ok-text', '--qr-warn-text', '--qr-bad-text', '--mrt-accent'])
    for (const bg of surf) { if (fg === '--mrt-accent' && bg === '--mrt-bg') continue; const r = ratio(col(th, fg), col(th, bg)); if (r < 4.5) bad.push(`${th.id} ${fg} on ${bg}: ${r.toFixed(2)}`); }
  assert.deepStrictEqual(bad, []);
});
test('button text/background pairs, including hover and disabled, are >= 4.5:1 in every theme (fills composited over the card)', () => {
  const P = [['--qr-btn-fg', '--qr-btn-bg'], ['--qr-btn-fg', '--qr-btn-bg-hover'], ['--qr-btn-primary-fg', '--qr-btn-primary-bg'], ['--qr-btn-primary-fg', '--qr-btn-primary-bg-hover'],
    ['--qr-btn-disabled-fg', '--qr-btn-disabled-bg'], ['--qr-disabled-fg', '--qr-disabled-bg'], ['--mrt-btn-secondary-fg', '--mrt-btn-neutral-fill'], ['--mrt-btn-secondary-fg', '--mrt-btn-neutral-fill-hover']];
  const bad = [];
  for (const th of THEMES) for (const base of ['--mrt-surface', '--mrt-surface-muted', '--mrt-bg']) { const under = col(th, base);
    for (const [f, b] of P) { const r = ratio(col(th, f), col(th, b, under)); if (r < 4.5) bad.push(`${th.id} ${f} on ${b} over ${base}: ${r.toFixed(2)}`); } }
  assert.deepStrictEqual(bad, []);
  assert.strictEqual(tokens('buttons.css')['--qr-btn-disabled-opacity'], '1', 'disabled controls must not fade below AA with opacity');
});
test('status dots, button borders and input borders are >= 3:1 on the card in every theme (non-text contrast)', () => {
  const bad = [];
  for (const th of THEMES) { const card = col(th, '--mrt-surface');
    for (const k of ['--qr-st-ok', '--qr-st-warn', '--qr-st-bad', '--qr-st-none']) { const r = ratio(col(th, k), card); if (r < 3) bad.push(`${th.id} ${k} ${r.toFixed(2)}`); }
    for (const k of ['--qr-btn-border', '--qr-input-border']) { const r = ratio(col(th, k, card), card); if (r < 3) bad.push(`${th.id} ${k} ${r.toFixed(2)}`); } }
  assert.deepStrictEqual(bad, []);
});
test('layering: canvas < cards, cards differ from the canvas, no flat white page (light) and no flat black page (dark)', () => {
  for (const th of THEMES) {
    const bg = col(th, '--mrt-bg'), card = col(th, '--mrt-surface'), bar = col(th, '--mrt-header-bg'), rail = col(th, '--qr-rail-bg');
    if (th.dark) { assert.ok(lum(card) < 0.3 && lum(bg) < 0.1, th.id + ' dark surfaces'); assert.ok(lum(card) > lum(bg), th.id + ' card lighter than canvas'); assert.ok(lum(col(th, '--mrt-text')) > 0.8, th.id + ' light text'); }
    else { assert.ok(lum(card) > 0.88, th.id + ' card near-white'); assert.ok(lum(bg) < 0.9 && lum(bg) > 0.35, th.id + ' canvas is a visible tint, not white: ' + lum(bg).toFixed(3)); assert.ok(lum(card) > lum(bg), th.id + ' card brighter than canvas'); }
    assert.notStrictEqual(bar.join(), bg.join(), th.id + ' bar differs from the canvas'); assert.notStrictEqual(rail.join(), card.join(), th.id + ' side column differs from the cards');
    assert.ok(ratio(card, bg) >= 1.05, th.id + ' card/canvas separation ' + ratio(card, bg).toFixed(2));
  }
  for (const th of THEMES.filter((x) => !x.dark)) assert.ok(lum(col(th, '--mrt-btn-neutral-fill', col(th, '--mrt-surface'))) > 0.8, th.id + ' light buttons');
});
test('the light default is the measured MRT light palette and the dark theme is MRT Dark Graphite', () => {
  const L = THEMES.find((x) => x.id === 'aris-glass/slate'), D = THEMES.find((x) => x.id === 'graphite/slate');
  assert.strictEqual(L.T['--mrt-bg'], '#ebebed'); assert.strictEqual(L.T['--mrt-surface'], '#ffffff'); assert.strictEqual(L.T['--mrt-text'], '#1c1c1e');
  assert.strictEqual(D.T['--mrt-bg'], '#252b36'); assert.strictEqual(D.T['--mrt-surface'], '#3d4654'); assert.strictEqual(D.T['--mrt-header-bg'], '#343d4a'); assert.strictEqual(D.T['--mrt-text'], '#ffffff');
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
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'theme', 'themes.ts'), 'utf8'), /dark \? 'graphite' : 'light'/); assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8'), /themeAttrs\(settings\)/);
  assert.match(rd('qrPalette.css'), /\.qr-root,[^{]*\)\[data-mrt-palette\]\[data-mrt-theme\]\s*\{/);
});
