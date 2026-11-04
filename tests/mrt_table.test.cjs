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
  assert.match(css, /table\.qr-mrt \{[^}]*width:\s*100%/);
  assert.match(css, /font-weight:\s*500 !important/);
  assert.doesNotMatch(css, /qr-mrt-fit \{[^}]*width:\s*max-content/);
});

test('package list: content columns, row menu, empty groups, no labelled More column', () => {
  const tri = R('src/components/wizard/TriageView.tsx');
  assert.match(tri, /<MrtTable shell className="qr-tri-tab"/);
  assert.doesNotMatch(tri, /fit="content"/);
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

test('MrtTable exposes shell and empty row; tables are full width', () => {
  const t = R('src/ui/MrtTable.tsx');
  assert.match(t, /function MrtEmpty/);
  assert.doesNotMatch(t, /qr-mrt-fit/);
  assert.match(t, /shell \? <div className="qr-mrt-shell">/);
});

test('one MRT border level: tab chip 1px, close/label/summary 0, no strip frame', () => {
  const layers = R('src/styles/layers.css');
  assert.match(layers, /\.qr-root \.mrt-workspace-tab \{[\s\S]*border:\s*1px solid/);
  assert.match(layers, /mrt-workspace-tab-strip[\s\S]*border:\s*0 !important/);
  assert.match(layers, /mrt-workspace-tab__close[\s\S]*border:\s*0 !important/);
  assert.match(layers, /qr-cks > summary[\s\S]*border:\s*0 !important/);
  assert.match(layers, /qr-ck-link[\s\S]*border:\s*0 !important/);
  assert.doesNotMatch(layers, /\.qr-root \.mrt-workspace-tab \{[^}]*border:\s*2px/);
  assert.match(R('src/styles/wizard.css'), /qr-cks-card \{[^}]*border:\s*1px solid var\(--mrt-grid-border/);
  assert.match(R('scripts/check-layout.cjs'), /nested border:/);
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
  assert.match(chrome, /justify-content:\s*flex-start/);
});

test('palette grid matches MRT light glass', () => {
  const pal = R('src/styles/qrPalette.css');
  assert.match(pal, /--mrt-grid-border:\s*#64748b/);
  assert.match(pal, /--mrt-grid-border-strong:\s*#334155/);
});

test('wizard footer sits on the rail (inline-start) and Finish check closes the job tab', () => {
  const foot = R('src/components/wizard/WizardFooter.tsx');
  assert.match(foot, /wz\.finish/);
  assert.match(foot, /tip\.wzFinish/);
  assert.doesNotMatch(foot, /wz\.close/);
  assert.match(R('src/styles/wizard.css'), /\.qr-wiz-footer \{[^}]*justify-content:\s*flex-start/);
  assert.doesNotMatch(R('src/ProjectView.tsx'), /window\.close/);
  assert.match(R('src/ProjectView.tsx'), /onCloseJob\(id\)/);
  assert.match(R('src/App.tsx'), /onCloseJob=\{P\.close\}/);
  assert.match(R('src/i18n/he.json'), /"wz\.finish": "סיום בדיקה"/);
  assert.match(R('src/i18n/en.json'), /"wz\.finish": "Finish check"/);
});

test('Recent is one card, plain order text, row click', () => {
  const r = R('src/components/history/RecentList.tsx');
  assert.doesNotMatch(r, /shell/);
  assert.doesNotMatch(r, /qr-hist-open/);
  assert.match(r, /onClick=\{\(\) => onOpen\(e\.id\)\}/);
  assert.match(r, /qr-recent-l/);
});

test('part navigator copies MRT settings segment; no double ring', () => {
  const g = R('src/components/partcard/GuidePanel.tsx');
  assert.match(g, /mrt-settings-segment-active/);
  assert.match(g, /mrt-btn-ghost/);
  const css = R('src/styles/wizard.css');
  assert.match(css, /qr-gstep \{[^}]*border-radius:\s*var\(--mrt-radius, 6px\)/);
  assert.doesNotMatch(css, /qr-gstep\[data-current='1'\] \{[^}]*box-shadow:\s*0 0 0 2px/);
  assert.match(R('src/styles/layers.css'), /button\.qr-gstep[\s\S]*border-width:\s*1px !important/);
});

test('status chips stay grouped, not 1fr stretched', () => {
  const wiz = R('src/styles/wizard.css');
  const layers = R('src/styles/layers.css');
  assert.match(wiz, /\.qr-root \.qr-stats \{ display: flex;/);
  assert.doesNotMatch(wiz, /minmax\(100px,\s*1fr\)/);
  assert.match(layers, /\.qr-root \.qr-stats, \.qr-root \.qr-tiles \{ display: flex !important/);
});

test('check-layout flags table width, footer side, and allows value wrap', () => {
  const m = R('scripts/check-layout.cjs');
  assert.match(m, /table not full width/);
  assert.match(m, /footer not rail-side/);
  assert.match(m, /qr-ck-val, \.qr-bd-v, \.qr-mrt-wrap/);
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
