'use strict';
// Wizard modules: one job each, small files, App.tsx stays thin; progress-toast logic; summary counts; card sections cover every friend category.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const src = (...p) => path.join(__dirname, '..', 'src', ...p);
const load = (...p) => import(pathToFileURL(src(...p)).href);
const MODS = ['components/wizard/Stepper.tsx', 'components/wizard/StepHeader.tsx', 'components/wizard/StepIntake.tsx', 'components/wizard/StepCheckParts.tsx', 'components/wizard/StepDocsQuestions.tsx', 'components/wizard/StepSummary.tsx', 'components/wizard/ProgressToast.tsx', 'components/wizard/RfqBar.tsx', 'components/wizard/Box.tsx',
  'components/partcard/PartCard.tsx', 'components/partcard/CardSection.tsx', 'components/partcard/sections.tsx', 'components/partcard/Fields.tsx', 'components/partcard/TableDialog.tsx', 'hooks/useBusy.ts', 'hooks/usePartCard.ts', 'views/Viewer.tsx'];
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
  const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json'); for (const k of ['busy.read', 'busy.ocr']) { assert.match(en[k], /\{i\}.*\{n\}/); assert.match(he[k], /\{i\}.*\{n\}/); } });
test('summary counts', async () => { const s = await load('wizard', 'summary.mjs');
  const parts = [{ problems: [{ severity: 'Question', status: 'open' }] }, { problems: [{ severity: 'Warning', status: 'open' }] }, { problems: [{ severity: 'Blocker', status: 'resolved' }] }];
  assert.deepStrictEqual(s.summaryCounts(parts), { nq: 1, np: 1, flagged: [1] }); });
test('card has one section component per friend category, in order', async () => { const b = await load('parts', 'breakdown.mjs');
  const s = fs.readFileSync(src('components/partcard/sections.tsx'), 'utf8');
  for (const sec of b.SECTIONS) assert.match(s, new RegExp("S\\('" + sec.key + "'\\)"), sec.key);
  assert.match(s, /CARD_SECTIONS = \[MaterialSection, HeatTreatSection, CoatingsSection, PaintSection, OtherProcessesSection, MaskingSection, SequenceSection\]/);
  assert.deepStrictEqual(b.cardFlags({ problems: [{ severity: 'Info' }, { severity: 'Warning', status: 'open' }] }).length, 1); });
test('stepper is a vertical rail on the start side', () => { const css = fs.readFileSync(src('styles', 'wizard.css'), 'utf8');
  assert.match(css, /\.qr-wiz \{[^}]*grid-template-columns: min\(17\.5rem/); assert.doesNotMatch(css, /\.qr-stepbar/); assert.doesNotMatch(css, /\.qr-wiz \{[^}]*\bleft\b/); });
