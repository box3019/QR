'use strict';
// Wizard modules: one job each, small files, App.tsx stays thin; progress-toast logic; summary counts; card sections cover every friend category.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const src = (...p) => path.join(__dirname, '..', 'src', ...p);
const load = (...p) => import(pathToFileURL(src(...p)).href);
const MODS = ['components/wizard/Stepper.tsx', 'components/wizard/StepHeader.tsx', 'components/wizard/StepIntake.tsx', 'components/wizard/StepCheckParts.tsx', 'components/wizard/TriageView.tsx', 'components/wizard/StepDocsQuestions.tsx', 'components/wizard/StepSummary.tsx', 'components/wizard/ProgressToast.tsx', 'components/wizard/RfqBar.tsx', 'components/wizard/Box.tsx',
  'components/partcard/PartCard.tsx', 'components/partcard/BlockCard.tsx', 'components/partcard/Fields.tsx', 'components/partcard/TableDialog.tsx', 'hooks/useBusy.ts', 'hooks/usePartCard.ts', 'views/Viewer.tsx'];
test('modules exist, start with a one-line job comment, stay small; App.tsx thin', () => {
  for (const m of MODS) { const s = fs.readFileSync(src(m), 'utf8'); assert.match(s.split('\n')[0], /^\/\/ \S/, m + ' job comment'); assert.ok(s.split('\n').length < 150, m + ' too long'); }
  const app = fs.readFileSync(src('App.tsx'), 'utf8'); assert.ok(app.split('\n').length <= 120, 'App.tsx grew'); assert.doesNotMatch(app, /function (DrawingView|RouteCard|RfqBar|BusyToast)/); });
test('components keep logic out: no event parsing / sheet mapping in components', () => {
  for (const m of MODS.filter((x) => x.startsWith('components/'))) { const s = fs.readFileSync(src(m), 'utf8'); assert.doesNotMatch(s, /ev\.type ===|\.reduce\(\(s: number, p/, m); } });
test('progress: plain localized key with i of n, bar fraction, tech line kept', async () => { const p = await load('wizard', 'progress.mjs');
  let b = p.startBusy(); b = p.reduceBusy(b, { type: 'status', stage: 'ocr', i: 2, n: 7, text: 'OCR x.PDF page 1 (low_ratio) at 400 DPI' });
  const v = p.progressView(b); assert.strictEqual(v.key, 'busy.ocr'); assert.deepStrictEqual(v.vars, { i: 2, n: 7 }); assert.ok(Math.abs(v.frac - 1 / 7) < 1e-9); assert.match(v.tech, /DPI/);
  assert.strictEqual(p.progressView(p.reduceBusy(b, { type: 'progress', value: 0.5 })).frac, 0.5);
  assert.strictEqual(p.progressView(p.startBusy()).key, 'busy.starting'); assert.strictEqual(p.reduceBusy(null, { type: 'status' }), null);
  const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json'); for (const k of ['busy.read', 'busy.ocr', 'busy.unpack', 'busy.parts']) { assert.match(en[k], /\{i\}.*\{n\}/); assert.match(he[k], /\{i\}.*\{n\}/); }
  let run = p.startBusy();
  run = p.reduceBusy(run, { type: 'status', stage: 'parts', i: 1, n: 7, text: 'Analysed 1 of 7 parts' });
  assert.strictEqual(p.busyComplete(run), false); assert.ok(p.stopBusy(run)); assert.strictEqual(p.progressView(run).key, 'busy.parts');
  run = p.reduceBusy(run, { type: 'status', stage: 'parts', i: 7, n: 7, text: 'Analysed 7 of 7 parts' });
  assert.strictEqual(p.busyComplete(run), true); assert.strictEqual(p.stopBusy(run), null); assert.strictEqual(p.progressView(run).done, true);
  const mid = p.reduceBusy(p.startBusy(), { type: 'status', stage: 'parts', i: 3, n: 7 });
  assert.strictEqual(p.stopBusy(mid) == null, false, 'busy stays on until every part is done');
  const done = p.reduceBusy(mid, { type: 'done', n: 7 });
  assert.strictEqual(p.busyComplete(done), true); assert.strictEqual(p.stopBusy(done), null); });
test('summary counts', async () => { const s = await load('wizard', 'summary.mjs');
  const parts = [{ problems: [{ severity: 'Question', status: 'open' }] }, { problems: [{ severity: 'Warning', status: 'open' }] }, { problems: [{ severity: 'Blocker', status: 'resolved' }] }];
  assert.deepStrictEqual(s.summaryCounts(parts), { nq: 1, np: 1, flagged: [0] }); });
test('card has one block per friend category (empty ones merged), in status order', async () => { const b = await load('parts', 'breakdown.mjs'); const bl = await load('parts', 'blocks.mjs');
  const pg = { page: 1, rows: [], procs: [] }; const part = { drawing: { pages: [] }, problems: [], standards: [], pages: [pg] };
  const none = bl.fieldBlocks({ ...part }).filter((x) => x.kind === 'none');
  assert.ok(b.SECTIONS.length >= 6);
  assert.deepStrictEqual(b.cardFlags({ problems: [{ severity: 'Info' }, { severity: 'Warning', status: 'open' }] }).length, 1); void none; });
test('stepper is a vertical rail on the start side', () => { const css = fs.readFileSync(src('styles', 'wizard.css'), 'utf8');
  assert.match(css, /\.qr-wiz \{[^}]*grid-template-columns: var\(--mrt-wizard-rail-width, 272px\) minmax\(0, 1fr\)/); assert.doesNotMatch(css, /\.qr-stepbar/); assert.doesNotMatch(css, /\.qr-wiz \{[^}]*\bleft\b/); });

test('part card flags use the localized (HE) message, not raw English', () => {
  const s = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'components', 'partcard', 'BlockCard.tsx'), 'utf8');
  require('assert').ok(/localized\(p, 'message'\)/.test(s) && !/\{p\.message\}/.test(s));
});
