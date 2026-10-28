'use strict';
// One-focus Check parts: list rows, one-line reasons, next part needing action, arrow keys (mirrored in Hebrew), no third column. Synthetic data only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const load = (f) => import(pathToFileURL(path.join(__dirname, '..', 'src', f)).href);
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const P = (partNo, o = {}) => ({ partNo, problems: [], tasks: [], ...o });
const doc = { type: 'uploadDocument', status: 'open', refNumber: 'STD-1' };
const blocker = { severity: 'Blocker', status: 'open', message: 'No material' };
const set = [P('A'), P('B', { tasks: [doc] }), P('C', { problems: [blocker] }), P('D', { rejectReason: 'x', status: 'rejected' }), P('E', { tasks: [doc, { ...doc, refNumber: 'STD-2' }] })];
test('reasonFor: one line per status', async () => { const m = await load('parts/reason.mjs');
  assert.strictEqual(m.reasonFor(set[0]).key, 'rsn.ready');
  assert.deepStrictEqual([m.reasonFor(set[1]).key, m.reasonFor(set[1]).vars.std], ['rsn.needsDoc', 'STD-1']);
  assert.deepStrictEqual([m.reasonFor(set[4]).key, m.reasonFor(set[4]).vars.n], ['rsn.needsDocN', 2]);
  assert.strictEqual(m.reasonFor(set[2]).prob, blocker);
  assert.strictEqual(m.reasonFor(set[3]).text, 'x'); assert.strictEqual(m.reasonFor(P('Z', { status: 'pending' })).key, 'rsn.pending'); });
test('listRows: needs-action first, ready last, filter narrows, original index kept', async () => { const m = await load('parts/reason.mjs');
  assert.deepStrictEqual(m.listRows(set).map((r) => r.part.partNo), ['B', 'E', 'C', 'D', 'A']);
  assert.deepStrictEqual(m.listRows(set, 'needsDoc').map((r) => r.index), [1, 4]); assert.deepStrictEqual(m.listRows([], null), []); });
test('nextNeeding: next part needing action after the current, wraps, -1 when none', async () => { const m = await load('parts/reason.mjs');
  assert.strictEqual(m.nextNeeding(set, 0), 1); assert.strictEqual(m.nextNeeding(set, 1), 2); assert.strictEqual(m.nextNeeding(set, 2), 4); assert.strictEqual(m.nextNeeding(set, 4), 1);
  assert.strictEqual(m.nextNeeding([P('A'), P('B')], 0), -1); assert.strictEqual(m.nextNeeding([P('A', { tasks: [doc] })], 0), -1); assert.strictEqual(m.nextNeeding([], 0), -1); });
test('arrow keys: Right = next in English, mirrored in Hebrew; other keys ignored; typing ignored', async () => { const m = await load('parts/reason.mjs');
  assert.strictEqual(m.arrowMove('ArrowRight', false), 1); assert.strictEqual(m.arrowMove('ArrowLeft', false), -1);
  assert.strictEqual(m.arrowMove('ArrowRight', true), -1); assert.strictEqual(m.arrowMove('ArrowLeft', true), 1); assert.strictEqual(m.arrowMove('ArrowUp', false), 0);
  assert.ok(m.typing({ tagName: 'INPUT' })); assert.ok(m.typing({ tagName: 'DIV', isContentEditable: true })); assert.ok(!m.typing({ tagName: 'DIV' })); assert.ok(!m.typing(null)); });
test('layout: Step 2 and 3 are list or part view, no list beside the part, buttons carry tooltips, keys in en and he', () => {
  const c = src('src/components/wizard/StepCheckParts.tsx'), d = src('src/components/wizard/StepDocsQuestions.tsx'), nav = src('src/components/wizard/PartNav.tsx'), pl = src('src/views/Parts.tsx');
  assert.ok(/open \|\| !part/.test(c) && /open \|\| !part/.test(d)); assert.ok(/PartsList/.test(c) && /PartsList/.test(d)); assert.ok(!/<PartsList[^>]*\/>[\s\S]*<PartCard/.test(c.split('return <div className="qr-body qr-onefocus qr-pview"')[1] || ''));
  assert.ok(/title=\{t\('pv\.tipBack'\)\}/.test(nav) && /btn-prev-part/.test(nav) && /btn-next-part/.test(nav)); assert.ok(/title=\{t\('pl\.open'/.test(pl));
  assert.ok(!/qr-card-nav/.test(src('src/components/partcard/PartCard.tsx')));
  for (const l of ['en', 'he']) { const j = JSON.parse(src('src/i18n/' + l + '.json')); for (const k of ['pv.back', 'pv.tipBack', 'pv.next', 'pv.tipNext', 'pv.prev', 'pv.tipPrev', 'pv.toDocs', 'pv.toSummary', 'pv.of', 'pl.open', 'rsn.ready', 'rsn.needsDoc', 'rsn.needsDocN', 'rsn.pending', 'rsn.notOurs']) assert.ok(j[k], l + ' ' + k); }
  const pv = src('src/ProjectView.tsx'); assert.ok(/setStep: stepTo/.test(pv) && /setPartOpen\(true\)/.test(pv)); });
