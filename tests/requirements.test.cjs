'use strict';
// core/requirements: the port of notes_extractor.py (friend's logic). Synthetic pages here; full parity vs the original
// Python runs in scripts/friend/compare.cjs on real samples (skipped when fixtures are absent).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { analyzePage } = require('../core/requirements/page.cjs');
const { linesFromPymupdf } = require('../core/requirements/lines.cjs');
const { classify } = require('../core/requirements/classify.cjs');
const { buildSheets, HEAD } = require('../core/requirements/sheets.cjs');
const { writeXlsx } = require('../core/requirements/xlsx.cjs');
const { routeFrom, materialFrom, problemsFrom } = require('../core/requirements/adapt.cjs');
const { derotate } = require('../core/requirements/mupdf.cjs');
const { N, he } = require('../core/requirements/he.cjs');

const L = (t, x, y, w = 400) => ({ t, bbox: [x, y, x + w, y + 10] });
const notesPage = () => linesFromPymupdf([
  L('NOTES:', 20, 10), L('1.  MATERIAL: ALUMINUM 6061-T6 PER AMS 4027', 20, 24), L('2.  ANODIZE PER MIL-A-8625 TYPE III CLASS 2, 0.002 INCH, BLACK', 20, 38),
  L('3.  MASK THREADS BEFORE ANODIZE', 20, 52), L('4.  PAINT PER MIL-PRF-85285 TWO COATS COLOR 36375 AFTER ANODIZE', 20, 66), L('5.  ALODINE ALL OVER', 20, 80)]);
const tablePage = () => linesFromPymupdf([
  L('No.', 100, 10, 20), L('DESCRIPTION', 130, 10, 80), L('20 MATERIAL', 100, 30, 80), L('20.1', 100, 44, 20), L('ALUMINUM ALLOY 6061-T651 PLATE PER AMS-QQ-A-250/11', 130, 44),
  L('50 SURFACE TREATMENT', 100, 58, 120), L('50.1', 100, 72, 20), L('CHROMIC ANODIZING WITH WATER SEALING, 3 µm MIN. THICK PER PS-900.', 130, 72)]);

test('categories follow the friend table (case-sensitive, many per line)', () => {
  assert.deepStrictEqual(classify('MASK THREADS BEFORE ANODIZE'), ['Coating', 'Masking']);
  assert.deepStrictEqual(classify('mask threads'), ['Masking']); // Masking rule is case-insensitive in the original
});
test('notes block: numbered notes, material, coatings in order, masking and summary', () => {
  const p = analyzePage(notesPage(), 800);
  assert.strictEqual(p.source, 'NOTES BLOCK');
  assert.deepStrictEqual(p.rows.map((r) => r.no), ['1', '2', '3', '4', '5']);
  assert.strictEqual(p.material.alloy, '6061'); assert.strictEqual(p.material.temper, 'T6');
  const an = p.procs.find((q) => q.subtype === 'Anodize');
  assert.match(an.typecls, /Type III/); assert.match(an.color, /Black/i);
  assert.strictEqual(p.masks[0].areas, 'Threads');
  assert.match(p.summary.flow, /Masking → Anodize/);
});
test('routing table: steps by section, sub-items numbered', () => {
  const p = analyzePage(tablePage(), 800);
  assert.strictEqual(p.source, 'ROUTING TABLE');
  assert.deepStrictEqual(p.rows.map((r) => [r.section, r.no]), [['', '20.1'], ['', '50.1']]); // same as the Python original for this layout
  const steps = routeFrom([{ page: 1, ...p }], () => 'other');
  assert.strictEqual(steps.reduce((n, s) => n + s.items.length, 0), 2);
  assert.match(materialFrom([{ page: 1, ...p }]).raw, /6061-T651/);
});
test('flags become one plain problem each, keyed for Hebrew', () => {
  const p = analyzePage(notesPage(), 800);
  const pr = problemsFrom([{ page: 1, ...p }]);
  assert.ok(pr.length >= 1);
  for (const x of pr) { assert.ok(x.key.startsWith('fx.')); assert.ok(x.message && !x.message.includes('\n')); }
});
test('sheets and xlsx: six sheets with the friend columns', () => {
  const p = analyzePage(notesPage(), 800);
  const S = buildSheets([{ file: 'a.pdf', page: 1, ...p }]);
  assert.deepStrictEqual(Object.keys(S), ['Requirements', 'Summary', 'Material', 'Processes', 'Masking', 'Process summary']);
  assert.strictEqual(S.Requirements.length, 5); assert.strictEqual(S.Requirements[0].length, HEAD.Requirements.length);
  const x = writeXlsx(S); assert.strictEqual(x.readUInt32LE(0), 0x04034b50); assert.ok(x.includes(Buffer.from('xl/worksheets/sheet6.xml')));
});
test('rotated pages map back to unrotated coordinates like pymupdf', () => {
  assert.deepStrictEqual(derotate([38, 53.6, 94.9, 67.4], 90, 842, 595).map((v) => +v.toFixed(1)), [53.6, 747.1, 67.4, 804]);
  assert.deepStrictEqual(derotate([1, 2, 3, 4], 0, 10, 10), [1, 2, 3, 4]);
});
test('Hebrew vocabulary covers every process, masking and category name', () => {
  const rules = require('../core/requirements/rules.json');
  for (const k of ['CATS', 'HT_TYPES', 'COAT_TYPES', 'PAINT_TYPES', 'MASK_METHODS', 'MASK_AREAS', 'MASK_TARGET']) for (const [name] of rules[k]) assert.ok(N[name], `${k}: ${name}`);
  assert.strictEqual(he('Anodize; Primer (page-level)'), 'אנודייז; פריימר (ברמת הדף)');
});
const DUMP = process.env.QR_FRIEND_DUMP;
test('parity with the original Python on real samples', { skip: !(DUMP && fs.existsSync(DUMP)) && 'fixtures absent (set QR_FRIEND_DUMP to a friend_dump.py output)' }, () => {
  const dump = JSON.parse(fs.readFileSync(DUMP, 'utf8'));
  const py = dump.map((d) => ({ ...d, summary: d.summary && { heatTreat: d.summary[0], masking: d.summary[1], coatings: d.summary[2], paint: d.summary[3], flow: d.summary[4], flagged: d.summary[5] } }));
  const js = dump.map((d) => ({ file: d.file, page: d.page, ...analyzePage(linesFromPymupdf(d.lines), d.width) }));
  assert.deepStrictEqual(buildSheets(js), buildSheets(py));
});
