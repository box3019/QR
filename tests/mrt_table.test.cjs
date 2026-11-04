'use strict';
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

test('MRT table skin: report TH/TD 42px 15px, grid #64748b, no row outline, no inset on groups', () => {
  const css = R('src/styles/mrtTable.css');
  assert.match(css, /\.qr-mrt-shell \{/);
  assert.match(css, /border-collapse:\s*collapse/);
  assert.match(css, /min-height:\s*42px/);
  assert.match(css, /font-size:\s*15px/);
  assert.match(css, /#64748b/);
  assert.match(css, /border-radius:\s*var\(--mrt-radius, 6px\)/);
  assert.match(css, /qr-mrt-row\[data-active='true'\] \{[^}]*outline:\s*none/);
  assert.match(css, /tr\.qr-mrt-gh th[^}]*box-shadow:\s*none/);
  assert.match(css, /tr\.qr-mrt-empty td[^}]*padding:\s*2rem/);
  assert.match(css, /\.qr-row-menu \{[^}]*34px/);
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

test('stylesheets load last: mrtTable then mrtChrome', () => {
  const main = R('src/main.tsx');
  assert.match(main, /layers\.css['"];\s*import '\.\/styles\/mrtTable\.css'/);
  assert.match(main, /mrtTable\.css['"];\s*import '\.\/styles\/mrtChrome\.css'/);
});

test('wizard chrome: 280px rail, 34px footer, 52px/17px dialog header, 42px dialog buttons', () => {
  const chrome = R('src/styles/mrtChrome.css');
  assert.match(chrome, /--mrt-wizard-rail-width:\s*280px/);
  assert.match(chrome, /height:\s*34px !important/);
  assert.match(chrome, /min-height:\s*52px/);
  assert.match(chrome, /font-size:\s*17px/);
  assert.match(chrome, /min-height:\s*42px/);
  assert.match(chrome, /justify-content:\s*flex-end/);
});

test('palette grid matches MRT light glass', () => {
  const pal = R('src/styles/qrPalette.css');
  assert.match(pal, /--mrt-grid-border:\s*#64748b/);
  assert.match(pal, /--mrt-grid-border-strong:\s*#334155/);
});

test('docs map real MRT v9.0.60 files onto QR files', () => {
  const doc = R('docs/mrt-parity.md');
  assert.match(doc, /mrtTableFocus\.ts/);
  assert.match(doc, /mrtUtilityShell\.ts/);
  assert.match(doc, /MrtCmmProgramWizard/);
  assert.match(doc, /src\/styles\/mrtTable\.css/);
  assert.match(doc, /src\/styles\/mrtChrome\.css/);
  assert.match(doc, /MrtPinInput[\s\S]*\*\*Excluded\*\*/);
  assert.match(doc, /#87878c/);
  assert.match(doc, /HistoryDialog.*MrtEmpty/);
  assert.doesNotMatch(doc, /light button fills|filled primary is not copied/);
});

test('History empty state is MrtEmpty inside the table', () => {
  const h = R('src/components/history/HistoryDialog.tsx');
  assert.match(h, /MrtEmpty/);
  assert.match(h, /testid="history-empty"/);
  assert.doesNotMatch(h, /<p className="qr-muted" data-testid="history-empty"/);
});

test('primary command button is MRT filled 42px', () => {
  const b = R('src/ui/mrtButtons.ts');
  assert.match(b, /h-\[42px\]/);
  assert.match(R('src/styles/buttons.css'), /--qr-btn-primary-bg:\s*#87878c/);
  assert.match(R('src/styles/qrPalette.css'), /--mrt-btn-primary-fg:\s*#ffffff/);
});
