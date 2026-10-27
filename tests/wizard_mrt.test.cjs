'use strict';
// MRT CMM-wizard layout: rail job table, stepper without sublabels, assistant hints (EN/HE, short), footer Cancel/Next/Close.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const src = (...p) => path.join(__dirname, '..', 'src', ...p); const load = (...p) => import(pathToFileURL(src(...p)).href);
const en = require('../src/i18n/en.json'); const he = require('../src/i18n/he.json');
test('hints: one key per step/context, all exist in EN and HE, at most ~2 lines', async () => { const { hintFor } = await load('wizard', 'hints.mjs');
  const keys = new Set(); for (const s of [1, 2, 3, 4]) for (const hasParts of [false, true]) for (const q of [0, 2]) keys.add(hintFor(s, { hasParts, nParts: 3, nQuestions: q }).key);
  keys.add(hintFor(2, { busy: true }).key); assert.deepStrictEqual([...keys].sort(), ['as.busy', 'as.h1', 'as.h1done', 'as.h2', 'as.h3', 'as.h3q', 'as.h4']);
  for (const k of keys) { for (const d of [en, he]) { assert.ok(d[k], k); assert.ok(d[k].length <= 140, k + ' too long'); } assert.doesNotMatch(he[k], /[A-Za-z]{3,}/, k + ' HE mixes English'); } });
test('assistant on by default, off only when set false', async () => { const { assistantOn } = await load('wizard', 'hints.mjs');
  assert.strictEqual(assistantOn({}), true); assert.strictEqual(assistantOn(null), true); assert.strictEqual(assistantOn({ assistant: false }), false);
  assert.strictEqual(require('../core/settings.cjs').DEFAULTS?.assistant ?? true, true); });
test('rail table rows RFQ/CUSTOMER/PARTS/FILES with dash when empty', async () => { const { railRows } = await load('wizard', 'context.mjs');
  assert.deepStrictEqual(railRows().map((r) => r.key), ['rfq', 'customer', 'parts', 'files']); assert.ok(railRows().every((r) => r.value === '\u2014'));
  const r = railRows({ rfqs: [{ rfq_no: 'R1', customer: 'C' }], parts: [{}, {}], files: [1] }); assert.deepStrictEqual(r.map((x) => x.value), ['R1', 'C', '2', '1']); });
test('stepper has no sublabels; header has no Next; footer has Cancel, Next, Close with tooltips', () => {
  const st = fs.readFileSync(src('components/wizard/Stepper.tsx'), 'utf8'); assert.doesNotMatch(st, /caption|wz\.c\d/);
  assert.doesNotMatch(fs.readFileSync(src('components/wizard/StepHeader.tsx'), 'utf8'), /btn-next/);
  const f = fs.readFileSync(src('components/wizard/WizardFooter.tsx'), 'utf8');
  for (const id of ['btn-cancel', 'btn-next', 'btn-close']) assert.match(f, new RegExp('data-testid="' + id + '" title=')); });
test('explanatory texts removed from the UI dictionaries', () => { for (const k of ['wz.c1', 'wz.h1', 'wz.xText', 'drop.hint']) { assert.ok(!(k in en), k); assert.ok(!(k in he), k); } });