'use strict';
// Every field the friend's notes_extractor.py writes (Material, Processes, Masking, Process summary sheets) is shown in QR's breakdown UI, with EN+HE labels.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const { HEAD } = require('../core/requirements/sheets.cjs');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'parts', 'breakdown.mjs')).href);
const COL = {
  Material: { Family: 'family', Alloy: 'alloy', Temper: 'temper', Form: 'form', Standards: 'stds', 'Raw dimensions': 'dims', 'Cat no': 'catno', Qty: 'qty', Unit: 'unit', 'Source text': 'src' },
  Processes: { 'No.': 'no', Process: 'process', Subtype: 'subtype', Layer: 'layer', Detail: 'detail', 'Standards / specs': 'stds', 'Type / Class': 'typecls', Thickness: 'thick', Coats: 'coats', Color: 'color', Hardness: 'hard', Temperature: 'temp', 'Case depth': 'case', Flags: 'flags', 'Source text': 'src' },
  Masking: { 'No.': 'no', Method: 'method', 'Areas masked': 'areas', 'Before process': 'before', Standards: 'stds', Flags: 'flags', 'Source text': 'src' },
  'Process summary': { 'Heat treat': 'heatTreat', Masking: 'masking', 'Coatings (in order)': 'coatings', Paint: 'paint', Flow: 'flow', Flagged: 'flagged' },
};
const KIND = { Material: 'material', Processes: 'proc', Masking: 'mask', 'Process summary': 'summary' };
test('every sheet column maps to a field the sheets builder writes', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'core', 'requirements', 'sheets.cjs'), 'utf8');
  for (const [sheet, map] of Object.entries(COL)) for (const col of HEAD[sheet].filter((c) => c !== 'File' && c !== 'Page')) {
    assert.ok(map[col], `${sheet}.${col} not mapped`); assert.match(src, new RegExp('\\b[mqks]\\.' + map[col] + '\\b'), `${sheet}.${col} -> ${map[col]} not in sheets.cjs`); } });
test('every field is rendered by some breakdown section of the right kind', async () => { const b = await load();
  for (const [sheet, map] of Object.entries(COL)) { const shown = new Set(b.SECTIONS.filter((s) => s.kind === KIND[sheet]).flatMap((s) => s.fields));
    for (const f of Object.values(map)) if (!(sheet === 'Processes' && f === 'process')) assert.ok(shown.has(f), `${sheet}.${f} not shown`); }
  assert.ok(b.SECTIONS.find((s) => s.key === 'other').fields.includes('process'));
  assert.deepStrictEqual(b.SECTIONS.map((s) => s.key), ['material', 'heat', 'coatings', 'paint', 'other', 'masking', 'sequence']); });
test('section rows split processes without losing any', async () => { const b = await load();
  const page = { rows: [{}], material: { family: 'Al' }, masks: [{ no: '5', method: 'Tape', before: 'AFTER HEAT TREAT' }], summary: { flow: 'A' },
    procs: [{ process: 'Heat treat' }, { process: 'Coating' }, { process: 'Coating' }, { process: 'Paint' }, { process: 'Passivate' }] };
  const n = (k) => b.sectionRows(b.SECTIONS.find((s) => s.key === k), page).length;
  assert.deepStrictEqual(['material', 'heat', 'coatings', 'paint', 'other', 'masking', 'sequence'].map(n), [1, 1, 2, 1, 1, 1, 1]); });
test('friend flags are recognised', async () => { const b = await load();
  assert.deepStrictEqual(b.flagKeys('MULTIPLE COATINGS IN ONE NOTE; NO STANDARD; LOCATION IN DRAWING; ASSEMBLY CONTEXT'), ['multi', 'noStd', 'location', 'assembly']);
  assert.deepStrictEqual(b.flagKeys('NO COATING FOUND ON PAGE'), ['noCoating']); });
test('labels in EN and HE for every field, section and flag; Breakdown renders through SECTIONS', async () => { const b = await load();
  const en = require('../src/i18n/en.json'), he = require('../src/i18n/he.json');
  const keys = [...new Set(b.SECTIONS.flatMap((s) => s.fields))].map((f) => 'bd.f.' + f).concat(b.SECTIONS.map((s) => 'bd.s.' + s.key), b.FLAGS.map(([, k]) => 'bd.flag.' + k));
  for (const k of keys) { assert.ok(en[k], 'en ' + k); assert.ok(he[k], 'he ' + k); assert.ok(!/[A-Za-z]/.test(he[k]), 'latin he ' + k); }
  const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'views', 'Breakdown.tsx'), 'utf8'); assert.match(ui, /SECTIONS\.map/); assert.match(ui, /'bd\.f\.' \+ f/); });
test('card helpers: line, action, locate', async () => { const b = await load();
  const pg = { rows: [{}], summary: { coatings: 'Anodize II' }, masks: [{ method: 'Tape', areas: 'Threads', before: 'AFTER HEAT TREAT' }], procs: [] };
  assert.strictEqual(b.sectionLine('coatings', pg), 'Anodize II'); assert.match(b.sectionLine('masking', pg), /AFTER HEAT TREAT/);
  assert.strictEqual(b.sectionLine('sequence', pg, { route: [{ seq: '1', title: 'CNC' }, { seq: '2', type: 'deburr' }] }), '1 CNC  2 deburr');
  assert.strictEqual(b.sectionAction(['noStd'], false), 'upload'); assert.strictEqual(b.sectionAction(['location'], false), 'ask'); assert.strictEqual(b.sectionAction([], false), 'confirm');
  const r = b.locate('ANODIZE PER MIL-A-8625', [{ text: 'ANODIZE', x: 10, y: 100, w: 40, h: 8 }, { text: 'MIL-A-8625', x: 55, y: 101, w: 50, h: 8 }, { text: 'OTHER', x: 0, y: 300, w: 10, h: 8 }]);
  assert.deepStrictEqual(r, { x: 10, y: 100, w: 95, h: 9 }); assert.strictEqual(b.locate('', []), null); });
