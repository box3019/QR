'use strict';
// Routing chart -> analysis: findChart, enrichRequirements (friend rows win), chartExtras, spec callouts, material card block. SYNTHETIC data only.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const os = require('os');
const { pathToFileURL } = require('url');
const A = require('../core/routing/apply.cjs');
const { specCallouts } = require('../core/standards/detect.cjs');
const S = require('../core/standards/index.cjs');
const { chartToRoute, chartFromText } = require('../core/routing/chart.cjs');
const { render } = require('../core/i18n/messages.cjs');
const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json'), ru = require('../src/i18n/ru.json');
const CHART = [
  'PRODUCTION ROUTING CHART', '10 MACHINING BY CAD FILE', '20 MATERIAL',
  '20.1 ALUMINUM ALLOY 6061-T651 PLATE L=144. W=48. T=0.5 INCH COMMERCIAL, 5012345678 0.250 KG',
  '30 MACHINING', '40 SURFACE TREATMENT',
  '40.1 HIGH PHOSPHOROUS ELECTROLESS NICKEL (10% -14% ), 5-7 ym THICK PER SAE-AMS-C-26074 Class 3',
  '40.2 SILVER PLATING,10-13 ym THICK PER ASTM B 700-08, GRADE D, CLASS N, TYPE 1',
  '40.3 SURFACE TREATMENT WITH GLASS SANDBLAST WITH GLASS MICROBEADS 40-70 UM ON SPECIFIED AREA',
  '40.4 DIMENSIONS ARE AFTER SURFACE TREATMENTS', '40.5 FINAL MACHINING ACC. TO SHEET 2',
  '50 INSPECTION', '50.1 VISUAL INSPECTION FOR THE ENTIRE LOT', '60 PACKING', '60.1 PACKING FOR SHIPMENT PER ACME GS-4P0S002',
].join('\n');
const textChart = () => A.findChart({ pages: [{ n: 1, raw: CHART }], requirements: [], text: CHART });

test('findChart: OCR chart wins, then page text; plain notes are not a chart', () => {
  assert.strictEqual(textChart().source, 'text');
  const o = A.findChart({ pages: [{ n: 2, raw: 'x', chart: { text: CHART } }], requirements: [], text: '' });
  assert.deepStrictEqual([o.source, o.page], ['ocr', 2]);
  assert.strictEqual(A.findChart({ pages: [{ n: 1, raw: '10 MACHINING\nplain notes' }], requirements: [], text: '' }), null);
});
test('route comes from the chart in printed order', () => {
  assert.deepStrictEqual(chartToRoute(textChart().chart).map((s) => s.seq + ':' + s.type), ['10:machining', '20:material', '30:machining', '40:surface', '50:inspection', '60:packing']);
});
test('material row: alloy, form, stock size, cat no, qty', () => {
  const r = A.enrichRequirements([], textChart())[0];
  assert.deepStrictEqual([r.material.family, r.material.alloy, r.material.temper, r.material.form, r.material.dims, r.material.catno, r.material.qty, r.material.unit], ['Aluminium', '6061', 'T651', 'plate', '144×48×0.5 inch', '5012345678', '0.25', 'KG']);
  assert.strictEqual(r.procs.length, 3);
  assert.deepStrictEqual(r.procs.map((p) => p.process + '/' + p.subtype), ['Coating/Electroless nickel', 'Coating/Silver plating', 'Other/Glass bead blast']);
  assert.match(r.summary.coatings, /Electroless nickel.*Silver plating/);
  assert.strictEqual(r.procs[1].thick, '10-13 µm');
});
test('enrich: friend rows win, nothing is duplicated, input is not mutated', () => {
  const req = [{ page: 1, rows: [{ no: '40.1' }], procs: [{ no: '40.1', process: 'Coating', subtype: 'Electroless nickel', stds: 'SAE-AMS-C-26074', flags: '' }], summary: { coatings: 'Electroless nickel' }, material: null, masks: [] }];
  const snap = JSON.stringify(req);
  const e = A.enrichRequirements(req, textChart());
  assert.strictEqual(JSON.stringify(req), snap);
  assert.deepStrictEqual(e[0].procs.map((p) => p.no), ['40.1', '40.2', '40.3']);
  assert.strictEqual(e[0].procs[0].stds, 'SAE-AMS-C-26074');
  assert.strictEqual(e[0].summary.coatings, 'Electroless nickel');
  assert.strictEqual(A.enrichRequirements(req, null), req);
});
test('extras: specs, machining after treatment, packing', () => {
  const x = A.chartExtras(textChart(), CHART);
  assert.deepStrictEqual(x.specs.map((s) => s.id), ['AMS-C-26074', 'ASTM B700', 'GS-4P05002']);
  assert.deepStrictEqual({ ...x.machiningAfter }, { no: '40.5', text: 'FINAL MACHINING ACC. TO SHEET 2', sheet: '2', rc: '40.5' });
  assert.deepStrictEqual(x.packing.map((p) => p.no), ['60.1']);
  assert.strictEqual(A.chartExtras(null, ''), null);
});
test('chart.after message exists in EN and HE with no English left in HE', () => {
  const r = render('chart.after', { rc: '40.5', sheet: '2' }, 'he');
  assert.ok(r.message && !/[A-Za-z]{3,}/.test(r.message.replace(/40\.5/g, '')), r.message);
  assert.match(render('chart.after', { rc: '40.5', sheet: '2' }, 'en').message, /40\.5/);
});
test('specs feed the standards library: known ones get a title, each becomes an upload task, customer docs are not paid', async () => {
  const cs = specCallouts(A.chartExtras(textChart(), CHART));
  assert.deepStrictEqual(cs.map((c) => c.kind + ':' + c.std), ['spec:AMS-C-26074', 'spec:ASTM B700', 'spec:GS-4P05002']);
  assert.strictEqual(specCallouts(null).length, 0);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qrspec'));
  const part = { partNo: 'P-1', rev: 'A', customer: 'ACME', chart: A.chartExtras(textChart(), CHART), tasks: [], problems: [] };
  await S.attachStandards(part, '', { base });
  const byStd = Object.fromEntries(part.standards.map((s) => [s.std, s]));
  assert.strictEqual(part.standards.length, 3);
  assert.match(byStd['AMS-C-26074'].title, /electroless nickel/i); assert.strictEqual(byStd['AMS-C-26074'].paid, true);
  assert.match(byStd['ASTM B700'].title, /silver/i);
  assert.strictEqual(byStd['GS-4P05002'].paid, false);
  for (const s of part.standards) assert.strictEqual(s.status, 'needsDoc');
  assert.strictEqual(part.tasks.filter((t) => /^Upload /.test(t.title)).length, 3);
});

test('refs find chart specs: spaced ASTM, SAE-AMS-C, customer packing', () => {
  const { findReferences } = require('../core/refs.cjs');
  const r = Object.fromEntries(findReferences('SILVER PER ASTM B 700-08\nNICKEL SAE-AMS-C-26074 CLASS 3\nPACK PER ACME GS-4P05002', 'ACME').map((x) => [x.number, x.kind]));
  assert.deepStrictEqual(r, { 'ASTM B700': 'public', 'AMS-C-26074': 'public', 'GS-4P05002': 'internal' });
});

const load = (...p) => import(pathToFileURL(path.join(__dirname, '..', 'src', ...p)).href);
test('material card block: one line, ours / not ours, raw text in the details, EN/HE/RU keys', async () => {
  const { materialBlock, fieldBlocks, buildBlocks } = await load('parts', 'blocks.mjs');
  const part = { partNo: 'A-1', status: 'accepted', requirements: [], tasks: [], problems: [], standards: [], route: [], material: { raw: 'ALUMINUM ALLOY 6061-T651 PLATE L=144. W=48. T=0.5 INCH', normalized: 'Aluminium 6061-T651', line: 'Aluminium 6061-T651, plate 144×48×0.5"', source: 'Routing chart 20.1' } };
  const b = materialBlock(part);
  assert.deepStrictEqual([b.kind, b.status, b.ours, b.value], ['material', 'ok', true, 'Aluminium 6061-T651, plate 144×48×0.5"']);
  assert.strictEqual(b.details.raw, part.material.raw);
  const f = fieldBlocks(part); assert.strictEqual(f.filter((x) => x.id === 'f:material').length, 1);
  assert.ok(!f.some((x) => x.line && x.line.key === 'blk.noMaterial'), 'no "material not found" when the part has a material');
  assert.strictEqual(materialBlock({ ...part, status: 'rejected' }).status, 'bad');
  assert.strictEqual(materialBlock({ ...part, status: 'pending' }).action.kind, 'ask');
  assert.strictEqual(materialBlock({ status: 'accepted' }), null);
  assert.strictEqual(buildBlocks({ ...part, material: null }).some((x) => x.line && x.line.key === 'blk.noMaterial'), true);
  for (const k of ['blk.mat.ours', 'blk.mat.notOurs']) { assert.ok(en[k] && he[k] && ru[k], k); assert.ok(!/[A-Za-z]/.test(he[k]), k); }
});
