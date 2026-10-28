'use strict';
// Settings uses ONE font family (the preset's --mrt-font-family) and only token font sizes (--qr-fs-xs/sm/md/lg/xl, button token --qr-btn-fs). No inline sizes/families in the Settings components.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');
const OK = /^(var\(--qr-fs-(xs|sm|md|lg|xl)\)|var\(--qr-btn-fs\)|inherit|1em|100%|0?\.?\d*em)$/;
// selectors that belong to Settings (the decorative preset mini-screens .qm-* / .qr-mock are aria-hidden pictures and are excluded)
const SEL = /\.qr-settings|\.qr-pres|\.qr-pcard|\.qr-chip\b|\.qr-chip-x|\.qr-sample|\.qr-modal-h|\.qr-ver\b|\.qr-field|\.qr-input|\.qr-muted/;
test('Settings components have no inline font size / family / weight', () => { for (const f of fs.readdirSync(path.join(root, 'src/settings')).filter((x) => x.endsWith('.tsx'))) { const s = rd('src/settings/' + f); assert.ok(!/fontSize|fontFamily|fontWeight|font-size|font-family/.test(s), f + ': inline font styling'); } });
test('Settings-related CSS rules use only token font sizes and no own font family', () => { const bad = [];
  for (const f of fs.readdirSync(path.join(root, 'src/styles')).filter((x) => x.endsWith('.css') && !/^mrtLiquidGlass/.test(x))) { rd('src/styles/' + f).split('\n').forEach((line, i) => { if (!SEL.test(line) || /\.qm-|\.qr-mock/.test(line)) return;
    for (const m of line.matchAll(/font-size:\s*([^;}]+?)\s*(!important)?\s*[;}]/g)) if (!OK.test(m[1])) bad.push(f + ':' + (i + 1) + ' font-size ' + m[1]);
    for (const m of line.matchAll(/font-family:\s*([^;}]+)/g)) if (!/^(var\(--mrt-font-family[^)]*\)|inherit)\s*(!important)?$/.test(m[1].trim()) && !/var\(--mrt-font-family, system-ui, sans-serif\)/.test(m[1])) bad.push(f + ':' + (i + 1) + ' font-family ' + m[1]); }); }
  assert.deepStrictEqual(bad, []); });
test('plain buttons and chips/status tags (shared by Settings) use token sizes too', () => { const fit = rd('src/styles/fit.css'), sys = rd('src/styles/system.css');
  assert.ok(/button, \.mrt-btn[^{]*\{[^}]*font-size: var\(--qr-fs-sm\) !important/.test(fit), 'global button size'); assert.ok(/\.qr-root \.qr-status, \.qr-root \.qr-chip \{[^}]*font-size: var\(--qr-fs-xs\)/.test(sys), 'chips and status tags');
  assert.ok(!/font-size:\s*1[0-9]px|font-size:\s*[0-9]px/.test(fit.split('.qr-topbar .mrt-topbar-cmd')[0]), 'no px sizes before the toolbar rule (toolbar px is a documented cap)'); });
test('the token sizes exist once and the Settings font family rule covers dialogs and native controls', () => { const w = rd('src/styles/wizard.css'); assert.ok(/--qr-fs-xs: 0\.75rem; --qr-fs-sm: 0\.875rem; --qr-fs-md: 1rem; --qr-fs-lg: 1\.2rem; --qr-fs-xl: 1\.6rem/.test(w));
  assert.ok(/\.qr-settings, \.qr-settings button, \.qr-settings input, \.qr-settings select, \.qr-settings textarea[^{]*\{ font-family: var\(--mrt-font-family/.test(w)); });
