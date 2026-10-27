'use strict';
// Project tabs: meta, reorder, close confirm, Outlook routing (focus same RFQ / use empty tab / new tab), storage round trip, per-job events, tab drags never import.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const os = require('os'); const path = require('path'); const { pathToFileURL } = require('url');
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'src', f)).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const P = require('../core/projects.cjs');
test('tab meta: label, customer, status', async () => { const s = await load('projects/store.mjs');
  assert.deepStrictEqual(s.tabMeta({}).status, 'empty');
  const m = s.tabMeta({ rfqs: [{ rfq_no: '123456', subject: 'RFQ 123456', customer: 'KLA' }], parts: [{ problems: [{ severity: 'Question', status: 'open' }] }], step: 2 });
  assert.strictEqual(m.label, '123456'); assert.strictEqual(m.customer, 'KLA'); assert.strictEqual(m.status, 'check'); assert.strictEqual(m.key, '123456');
  assert.strictEqual(s.tabMeta({ parts: [{ partNo: 'X1', problems: [] }] }).status, 'ready'); assert.strictEqual(s.tabMeta({ busy: {}, parts: [] }).status, 'busy');
  assert.strictEqual(s.tabMeta({ rfqs: [{ subject: 'Quote request', customer: { name: 'ELTA' } }] }).customer, 'ELTA'); });
test('reorder and close confirm', async () => { const s = await load('projects/store.mjs');
  assert.deepStrictEqual(s.reorder(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']); assert.deepStrictEqual(s.reorder(['a', 'b'], 1, 1), ['a', 'b']);
  assert.strictEqual(s.closeNeedsConfirm({ status: 'ready' }), false); assert.strictEqual(s.closeNeedsConfirm({ status: 'busy' }), true); assert.strictEqual(s.closeNeedsConfirm({ status: 'ready', dirty: true }), true); });
test('Send to QR: same RFQ focuses its tab, empty current tab is used, else a new tab', async () => { const s = await load('projects/store.mjs');
  const tabs = [{ id: 'a', key: '111111', status: 'ready' }, { id: 'b', key: null, status: 'empty' }];
  assert.deepStrictEqual(s.routeOutlook(tabs, '111111', 'b'), { kind: 'focus', id: 'a' });
  assert.deepStrictEqual(s.routeOutlook(tabs, '222222', 'b'), { kind: 'active', id: 'b' });
  assert.deepStrictEqual(s.routeOutlook(tabs, '222222', 'a'), { kind: 'new' }); });
test('storage: save, index order, reopen; bad ids refused', () => { const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qrp-'));
  P.saveProject(base, 'p1-abc', { step: 2, parts: [1] }); P.saveProject(base, 'p2-def', { step: 1, parts: [] }); P.saveIndex(base, { order: ['p2-def', 'p1-abc'], active: 'p1-abc' });
  const r = P.listProjects(base); assert.deepStrictEqual(r.order, ['p2-def', 'p1-abc']); assert.strictEqual(r.active, 'p1-abc'); assert.strictEqual(r.projects[1].data.step, 2);
  assert.ok(fs.existsSync(path.join(base, 'projects', 'p1-abc', 'project.json')));
  assert.throws(() => P.saveProject(base, '..\\x', {})); assert.deepStrictEqual(P.listProjects(fs.mkdtempSync(path.join(os.tmpdir(), 'qrp-'))).projects, []); });
test('peekRfq reads the first e-mail subject', async () => {
  assert.strictEqual(await P.peekRfq(['a.pdf', 'b.msg'], async () => ({ subject: 'RE: RFQ 654321 parts' })), '654321');
  assert.strictEqual(await P.peekRfq(['a.pdf'], async () => ({ subject: 'x' })), null); assert.strictEqual(P.rfqKey('FW: Quote for brackets'), 'Quote for brackets'); });
test('events carry the project id; each project only takes its own', () => {
  assert.match(src('electron/main.cjs'), /job: job \|\| null/); assert.match(src('electron/preload.cjs'), /invoke\('qr:process', paths, job\)/);
  const b = src('src/hooks/useBusy.ts'); assert.match(b, /if \(!forJob\(ev, job\)\) return;/); assert.match(src('src/ProjectView.tsx'), /qr\(\)\.process\(paths, id\)/); });
test('tab drag never imports: internal drag flag and stopPropagation on tab drops', async () => { const g = await load('wizard/dropGuard.mjs');
  assert.strictEqual(g.isExternalDrop(['text/x-qr-tab'], true), false); assert.strictEqual(g.isExternalDrop(['text/x-qr-tab'], false), false);
  const tb = src('src/components/tabs/TabsBar.tsx'); assert.match(tb, /draggable/); assert.match(tb, /qr-ptabs/); assert.doesNotMatch(src('src/styles/wizard.css'), /\.qr-tabs \{ display: flex; align-items: center; gap: 0\.375rem; flex: 1/, 'must not restyle the viewer tab bar'); assert.match(tb, /e\.stopPropagation\(\); onMove/); assert.match(tb, /title=\{t\('tab\.add'\)\}/); assert.match(tb, /title=\{t\('tab\.close'\)\}/); });
test('every project stays mounted (own step, parts, viewer position); HE tab labels have no English', () => {
  const a = src('src/App.tsx'); assert.match(a, /P\.list\.map\(\(p\) => <ProjectView/); assert.match(src('src/styles/wizard.css'), /\.qr-proj-off \{ position: absolute; inset: 0; visibility: hidden/);
  const he = require('../src/i18n/he.json'); for (const k of Object.keys(he).filter((k) => k.startsWith('tab.'))) assert.doesNotMatch(he[k], /[A-Za-z]/, k); });
