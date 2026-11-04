'use strict';
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

test('MRT table skin: one grid, no row outline, no inset bar on table groups', () => {
  const css = R('src/styles/mrtTable.css');
  assert.match(css, /\.qr-mrt-shell \{/);
  assert.match(css, /border-collapse:\s*collapse/);
  assert.match(css, /table\.qr-mrt th,\s*\n\.qr-root table\.qr-mrt td \{[^}]*border:\s*1px solid/);
  assert.match(css, /qr-mrt-row\[data-active='true'\] \{[^}]*outline:\s*none/);
  assert.match(css, /tr\.qr-mrt-gh th[^}]*box-shadow:\s*none/);
  assert.match(css, /tr\.qr-mrt-empty td/);
  assert.match(css, /\.qr-row-menu \{/);
  assert.match(css, /qr-mrt-fit \{[^}]*width:\s*max-content/);
});

test('package list: content columns, row menu, empty groups, no labelled More column', () => {
  const tri = R('src/components/wizard/TriageView.tsx');
  assert.match(tri, /shell fit="content"/);
  assert.match(tri, /<MoreMenu row /);
  assert.match(tri, /MrtEmpty/);
  assert.doesNotMatch(tri, /gd\.more/);
  assert.doesNotMatch(tri, /5\.2rem/);
  assert.match(tri, /qr-mrt-c-check/);
});

test('MoreMenu row variant is icon-only', () => {
  const m = R('src/components/MoreMenu.tsx');
  assert.match(m, /row \? 'qr-row-menu'/);
  assert.match(m, /row \? null : <span>\{label/);
});

test('MrtTable exposes shell, fit, empty row', () => {
  const t = R('src/ui/MrtTable.tsx');
  assert.match(t, /function MrtEmpty/);
  assert.match(t, /fit === 'content' \? ' qr-mrt-fit'/);
  assert.match(t, /shell \? <div className="qr-mrt-shell">/);
});

test('stylesheet is loaded after layers so the grid wins', () => {
  assert.match(R('src/main.tsx'), /layers\.css['"];\s*import '\.\/styles\/mrtTable\.css'/);
});
