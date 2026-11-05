'use strict';
// MRT v9.0.60 chrome: tabs row above equal icon+label toolbar; LeftPanel-style rail (no PIN/ERP).
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'src', f)).href);

test('tabs row is above the command toolbar', () => {
  const a = src('src/App.tsx');
  const chrome = a.slice(a.indexOf('qr-chrome'), a.indexOf('className="qr-projs"'));
  assert.ok(chrome.indexOf('qr-tabrow') < chrome.indexOf('qr-topbar mrt-workspace-topbar-chrome'), 'tabs before toolbar');
  assert.ok(chrome.indexOf('<TabsBar') < chrome.indexOf('<FileMenu'), 'TabsBar before File');
  assert.ok(/mrt-topbar-command-row--commands/.test(chrome));
  assert.ok(!/PIN|Erp|erp|inspector/.test(chrome));
});

test('toolbar File and More have icon-above-caps plus dropdown caret', () => {
  const f = src('src/components/FileMenu.tsx');
  const m = src('src/components/MoreMenu.tsx');
  assert.ok(/mrt-topbar-cmd-icon/.test(f) && /mrt-topbar-cmd-label/.test(f) && /mrt-topbar-cmd-chevron/.test(f));
  assert.ok(/mrt-topbar-cmd-chevron/.test(m) && /mrt-topbar-menu-trigger/.test(m));
  assert.ok(/name="chevron"/.test(f) && /chevron:/.test(src('src/components/Ico.tsx')));
});

test('toolbar CSS is MRT 56x96 equal buttons; footer stays 34', () => {
  const fit = src('src/styles/fit.css');
  const layers = src('src/styles/layers.css');
  const wiz = src('src/styles/wizard.css');
  const chrome = src('src/styles/mrtChrome.css');
  assert.ok(/height: 56px !important/.test(fit) && /width: 96px !important/.test(fit));
  assert.ok(/height: 56px !important/.test(layers) && /width: 96px !important/.test(layers));
  assert.ok(/width: 96px !important; min-width: 96px !important/.test(wiz));
  assert.ok(/height: 34px !important/.test(wiz) && /flex: 0 0 10.5rem/.test(wiz));
  assert.ok(/--mrt-wizard-rail-width: 272px/.test(chrome));
  assert.ok(/height: 40px !important/.test(wiz) && /qr-tri-bar button/.test(wiz));
});

test('side rail merges caption, thumbnail, job table, stepper and actions; no PIN/ERP', () => {
  const r = src('src/components/wizard/WizardRail.tsx');
  const p = src('src/ProjectView.tsx');
  assert.ok(/rail\.caption/.test(r) && /rail-number/.test(r) && /qr-rail-rule/.test(r));
  assert.ok(/rail-thumb/.test(r) && /preview\?/.test(r) && /rail-thumb-empty/.test(r));
  assert.ok(/<RailContext/.test(r) && /<Stepper/.test(r) && /rail-critical/.test(r) && /rail-open-drawing/.test(r));
  const code = r.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/MrtPinInput|inspectorRole|UserIcon|erp/i.test(code));
  assert.ok(/<WizardRail/.test(p) && !/<RailContext/.test(p) && !/<Stepper/.test(p));
  assert.ok(/qr-rail-steps/.test(src('src/components/wizard/Stepper.tsx')));
});

test('check-layout expects MRT toolbar/footer heights and same-row equality', () => {
  const m = src('scripts/check-layout.cjs');
  assert.ok(/want 56/.test(m) && /want 34/.test(m));
  assert.ok(/toolbar buttons/.test(m) && /triage buttons/.test(m) && /unequal height/.test(m));
  assert.ok(/tabs not above toolbar/.test(m));
  assert.ok(/footer button height/.test(m));
});

test('rail helpers: job label, drawing pick, critical count; i18n EN/HE', async () => {
  const { jobLabel, drawingOf, criticalCount } = await load('wizard/rail.mjs');
  assert.strictEqual(jobLabel({ rfqs: [{ rfq_no: '1081993' }] }), '1081993');
  assert.strictEqual(jobLabel({ parts: [{ partNo: 'PN-1' }] }), 'PN-1');
  assert.strictEqual(jobLabel({}), '');
  const d1 = { path: '/a.pdf', pages: [{ n: 1 }] };
  assert.strictEqual(drawingOf([{ drawing: d1 }], 0), d1);
  assert.strictEqual(drawingOf([{ }, { drawing: d1 }], 0), d1);
  assert.strictEqual(drawingOf([]), null);
  assert.strictEqual(criticalCount([]), 0);
  assert.strictEqual(criticalCount([{ checklist: { cand: {} } }]), 0);
  const en = JSON.parse(src('src/i18n/en.json')), he = JSON.parse(src('src/i18n/he.json'));
  for (const k of ['rail.caption', 'rail.critical', 'rail.stack', 'rail.thumb', 'rail.noThumb', 'rail.openChecklist']) {
    assert.ok(en[k] && he[k], k);
    assert.ok(!/[A-Za-z]/.test(he[k]), 'latin in he ' + k);
  }
});
