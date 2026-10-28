'use strict';
// routing chart parser: SYNTHETIC charts only (no customer data).
const test = require('node:test'); const assert = require('node:assert');
const C = require('../core/routing/chart.cjs');

const CHART = [
  'PRODUCTION ROUTING CHART',
  '10 MACHINING BY CAD FILE',
  '20 MATERIAL',
  '20.1 ALUMINUM ALLOY 6061-T651 PLATE L=144. W=48. T=0.5 INCH COMMERCIAL, 5012345678 0.250 KG',
  '20.2 OTHER SIZE AND/OR SHAPE OF SAME MATERIAL AND THERMAL CONDITION IS APPROVED',
  '30 MACHINING',
  '30.1 DO NOT BREAK SHARP EDGES',
  '40 SURFACE TREATMENT',
  '40.1 HIGH PHOSPHOROUS ELECTROLESS NICKEL (10% -14% ), 5-7 ym THICK PER SAE-AMS-C-26074 Class 3',
  '40.2 SILVER PLATING,10-13 ym THICK PER ASTM B 700-08, GRADE D, CLASS N, TYPE 1',
  '40.3 SURFACE TREATMENT WITH GLASS SANDBLAST WITH GLASS MICROBEADS 40-70 UM ON SPECIFIED AREA',
  '40.4 DIMENSIONS ARE AFTER SURFACE TREATMENTS',
  '40.5 FINAL MACHINING ACC. TO SHEET 2',
  '50 INSPECTION',
  '50.1 VISUAL INSPECTION FOR THE ENTIRE LOT',
  '60 PACKING',
  '60.1 PACKING FOR SHIPMENT PER ACME GS-4P0S002',
  'TOLERANCES, UNLESS OTHERWISE SPECIFIED',
].join('\n');

test('operations are classified by printed name, not number', () => {
  const c = C.chartFromText(CHART);
  assert.deepStrictEqual(c.ops.map((o) => o.no + ':' + o.kind), ['10:machining', '20:material', '30:machining', '40:surface', '50:inspection', '60:packing']);
  const swapped = C.chartFromText(CHART.replace('40 SURFACE TREATMENT', '50 SURFACE TREATMENT').replace(/^40\.(\d)/gm, '50.$1').replace('50 INSPECTION', '40 INSPECTION').replace(/^50\.(1) VISUAL/m, '40.$1 VISUAL'));
  assert.ok(swapped.ops.some((o) => o.no === '50' && o.kind === 'surface'));
  assert.ok(swapped.ops.some((o) => o.no === '40' && o.kind === 'inspection'));
});
test('material row: alloy text, stock size, cat no, qty, unit; alt stock is a note', () => {
  const c = C.chartFromText(CHART);
  assert.match(c.material.raw, /^ALUMINUM ALLOY 6061-T651 PLATE/);
  assert.deepStrictEqual({ ...c.material.stock }, { l: 144, w: 48, t: 0.5, d: null, unit: 'inch' });
  assert.strictEqual(c.material.catNo, '5012345678'); assert.strictEqual(c.material.qty, 0.25); assert.strictEqual(c.material.uom, 'KG');
  assert.ok(c.notes.some((n) => n.kind === 'altStock' && n.no === '20.2'));
  assert.ok(!/5012345678/.test(c.material.raw));
});
test('surface rows: process kind, name, spec with class/type/grade, thickness', () => {
  const c = C.chartFromText(CHART);
  const t = Object.fromEntries(c.treatments.map((x) => [x.no, x]));
  assert.strictEqual(t['40.1'].kind, 'plating'); assert.strictEqual(t['40.1'].process, 'Electroless nickel');
  assert.strictEqual(t['40.1'].specs[0].id, 'SAE-AMS-C-26074'.replace('SAE-', '')); assert.strictEqual(t['40.1'].specs[0].class, '3');
  assert.deepStrictEqual({ ...t['40.1'].thickness }, { min: 5, max: 7, unit: 'µm', text: '5-7 µm' });
  assert.strictEqual(t['40.2'].process, 'Silver plating');
  assert.strictEqual(t['40.2'].specs[0].id, 'ASTM B700'); assert.strictEqual(t['40.2'].specs[0].year, '08');
  assert.strictEqual(t['40.2'].specs[0].grade, 'D'); assert.strictEqual(t['40.2'].specs[0].type, '1');
  assert.strictEqual(t['40.3'].kind, 'blasting'); assert.strictEqual(t['40.3'].area, 'specified area');
});
test('machining after treatment and the dimension note', () => {
  const c = C.chartFromText(CHART);
  assert.deepStrictEqual({ ...c.machiningAfter }, { no: '40.5', text: 'FINAL MACHINING ACC. TO SHEET 2', sheet: '2' });
  assert.ok(c.notes.some((n) => n.kind === 'dimAfterTreatment' && n.no === '40.4'));
  assert.deepStrictEqual({ ...C.extraStageNote('NOTE: THIS PART HAS AN ADDITIONAL STAGE OF MACHINING AFTER SURFACE TREATMENT (SEE RC 40.5).') }, { rc: '40.5' });
  assert.strictEqual(C.extraStageNote('NOTE: NOTHING'), null);
});
test('inspection / packing rows and OCR-damaged spec numbers (GS-4P0S002 -> GS-4P05002)', () => {
  const c = C.chartFromText(CHART);
  assert.strictEqual(c.inspection.length, 1); assert.strictEqual(c.packing.length, 1);
  assert.strictEqual(c.packing[0].specs[0].id, 'GS-4P05002');
  assert.deepStrictEqual(c.specs.map((s) => s.id), ['AMS-C-26074', 'ASTM B700', 'GS-4P05002'].map((x) => (x === 'AMS-C-26074' ? 'AMS-C-26074' : x)));
});
test('multi-line rows are joined; headers and sub-headers are skipped', () => {
  const c = C.chartFromText('ROUTING CHART\nNO.\nDESCRIPTION\n10 MACHINING\n10.1 FACE MILL\nTHE TOP\nDESCRIPTION CAT NO QTY UM\n20 MATERIAL\n20.1 STEEL 4130 BAR D=20 MM');
  assert.strictEqual(c.ops[0].items[0].text, 'FACE MILL THE TOP');
  assert.strictEqual(c.material.stock.d, 20);
});
test('no header -> null; rows from the requirements port', () => {
  assert.strictEqual(C.chartFromText('NOTES\n1. DEBURR'), null);
  const c = C.chartFromRequirements([{ source: 'ROUTING TABLE (OCR)', rows: [{ section: '40 SURFACE TREATMENT', no: '40.1', text: 'ANODIZE PER MIL-A-8625 TYPE II CLASS 2', extra: '' }] }]);
  assert.strictEqual(c.treatments[0].kind, 'anodize'); assert.strictEqual(c.treatments[0].specs[0].id, 'MIL-A-8625'); assert.strictEqual(c.treatments[0].specs[0].type, 'II');
});
test('route steps in QR shape', () => {
  const r = C.chartToRoute(C.chartFromText(CHART));
  assert.deepStrictEqual(r.map((s) => s.seq + ':' + s.type), ['10:machining', '20:material', '30:machining', '40:surface', '50:inspection', '60:packing']);
  assert.strictEqual(r[3].items.length, 5);
});
