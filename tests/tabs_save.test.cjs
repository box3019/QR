'use strict';
// Tab close x, Save / Save as / Open wiring, Saved hh:mm, shortcuts, and the loaded summary that replaces the empty Intake area. Synthetic data only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'src', f)).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('hhmm: 24 h local time, empty for invalid', async () => { const s = await load('projects/store.mjs');
  const d = new Date(2026, 9, 28, 9, 5); assert.strictEqual(s.hhmm(d.toISOString()), '09:05'); assert.strictEqual(s.hhmm(''), ''); assert.strictEqual(s.hhmm('x'), ''); assert.strictEqual(s.hhmm(null), ''); });
test('tabMeta carries savedAt', async () => { const s = await load('projects/store.mjs');
  assert.strictEqual(s.tabMeta({ savedAt: '2026-10-28T07:00:00Z' }).savedAt, '2026-10-28T07:00:00Z'); assert.strictEqual(s.tabMeta({}).savedAt, null); });
test('dropped .qrproj files open as projects, the rest is imported', async () => { const s = await load('projects/store.mjs');
  const r = s.splitProjectFiles(['C:\\a\\x.QRPROJ', 'C:\\a\\d.pdf', 'C:\\a\\y.qrproj', 'C:\\a\\m.msg']); assert.deepStrictEqual(r.projects, ['C:\\a\\x.QRPROJ', 'C:\\a\\y.qrproj']); assert.deepStrictEqual(r.rest, ['C:\\a\\d.pdf', 'C:\\a\\m.msg']);
  assert.deepStrictEqual(s.splitProjectFiles(null), { projects: [], rest: [] }); });
test('shortcuts: Ctrl+S save, Ctrl+Shift+S save as, Ctrl+W close, Ctrl+O open', async () => { const s = await load('projects/store.mjs');
  const k = (key, o = {}) => s.shortcutAction({ key, ctrlKey: true, ...o });
  assert.strictEqual(k('s'), 'save'); assert.strictEqual(k('S', { shiftKey: true }), 'saveAs'); assert.strictEqual(k('w'), 'close'); assert.strictEqual(k('o'), 'open');
  assert.strictEqual(s.shortcutAction({ key: 's' }), null); assert.strictEqual(k('s', { altKey: true }), null); assert.strictEqual(k('x'), null); assert.strictEqual(s.shortcutAction(null), null); });
test('closing: only a running job asks; never deletes', async () => { const s = await load('projects/store.mjs');
  assert.strictEqual(s.closeNeedsConfirm({ status: 'busy' }), true); assert.strictEqual(s.closeNeedsConfirm({ status: 'ready', dirty: true }), false); assert.strictEqual(s.closeNeedsConfirm({ status: 'empty' }), false);
  const up = src('src/projects/useProjects.ts'); assert.ok(!/removeHistory|rmSync|unlink/.test(up)); assert.ok(/closeNeedsConfirm/.test(up) && /\.save\(\)/.test(up)); });
test('tab x: on every tab (also the only one), MRT icon, middle click', () => { const t = src('src/components/tabs/TabsBar.tsx');
  assert.ok(!/tabs\.length\s*>\s*1/.test(t)); assert.ok(/strokeWidth="2\.25"/.test(t) && /width="12"/.test(t)); assert.ok(/mrt-workspace-tab__close/.test(t) && /onAuxClick/.test(t) && /title=\{t\('tab\.close'\)\}/.test(t));
  const css = src('src/styles/wizard.css'); assert.ok(!/__close \{[^}]*opacity: 0/.test(css)); });
test('Save, Save as, Open buttons with tooltips; shortcuts; Saved indicator; .qrproj drop', () => { const a = src('src/App.tsx');
  for (const id of ['btn-save', 'btn-save-as', 'btn-open-project', 'saved-at']) assert.ok(a.includes('"' + id + '"'), id);
  assert.ok(/shortcutAction/.test(a) && /splitProjectFiles/.test(a) && /openProject/.test(a) && /tip\.save/.test(a) && /tip\.saveAs/.test(a) && /tip\.open/.test(a));
  const v = src('src/ProjectView.tsx'); assert.ok(/doSave/.test(v) && /savedAt/.test(v) && /busyRef\.current\) return null/.test(v));
  const m = src('electron/main.cjs'); for (const c of ['qr:projects:saveAs', 'qr:projects:pickOpen', 'qr:projects:import']) assert.ok(m.includes(c), c); });
test('i18n: new keys in en and he', () => { const en = JSON.parse(src('src/i18n/en.json').replace(/^\uFEFF/, '')), he = JSON.parse(src('src/i18n/he.json').replace(/^\uFEFF/, ''));
  for (const k of ['tab.closeBusy', 'top.save', 'top.saveAs', 'top.open', 'top.saved', 'tip.save', 'tip.saveAs', 'tip.open', 'tip.saved', 'notice.savedAs', 'notice.saveFailed', 'notice.openFailed', 'ld.parts', 'ld.files', 'ld.drawings', 'ld.models', 'ld.list', 'ld.other', 'ld.tipPart']) { assert.ok(en[k], 'en ' + k); assert.ok(he[k], 'he ' + k); }
  assert.ok(/\{time\}/.test(en['top.saved']) && /\{time\}/.test(he['top.saved'])); });

test('loaded summary: tiles and files grouped by part', async () => { const s = await load('wizard/loaded.mjs');
  const parts = [{ partNo: 'A100', rev: 'B', drawing: { name: 'A100_B.pdf' }, model: { path: 'C:\\x\\A100.step' } }, { partNo: 'B200', drawing: { name: 'B200.pdf' }, duplicates: ['C:\\x\\B200_old.pdf'] }];
  const r = s.loadedSummary(parts, ['C:\\x\\A100_B.pdf', 'C:\\x\\A100.step', 'C:\\x\\B200.pdf', 'C:\\x\\B200_old.pdf', 'C:\\x\\mail.msg', 'C:\\x\\notes.txt']);
  assert.deepStrictEqual(r.tiles, { parts: 2, files: 6, drawings: 3, models: 1 }); assert.deepStrictEqual(r.groups[0].files, ['A100_B.pdf', 'A100.step']); assert.strictEqual(r.groups[0].rev, 'B');
  assert.deepStrictEqual(r.other, ['mail.msg', 'notes.txt']); assert.deepStrictEqual(s.loadedSummary([], []).tiles, { parts: 0, files: 0, drawings: 0, models: 0 }); });
test('loaded summary replaces the empty Intake area once parts exist and nothing is running', async () => { const s = await load('wizard/loaded.mjs');
  assert.strictEqual(s.showLoaded({ active: false }, 6), true); assert.strictEqual(s.showLoaded({ active: true }, 6), false); assert.strictEqual(s.showLoaded(null, 0), false);
  const i = src('src/components/wizard/StepIntake.tsx'); assert.ok(/showLoaded\(view, nParts\)/.test(i) && /LoadedSummary/.test(i));
  const l = src('src/components/wizard/LoadedSummary.tsx'); for (const id of ['ld-tiles', 'ld-list', 'btn-loaded-next', 'btn-loaded-files', 'btn-loaded-folder']) assert.ok(l.includes(id), id);
  assert.ok(!/<button(?![^>]*title=)/.test(l.replace(/\n/g, ' ')), 'every button has a tooltip'); });
