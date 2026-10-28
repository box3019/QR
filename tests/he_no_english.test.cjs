'use strict';
// HE mode must contain no English words except part numbers, specs, catalog grades and quoted drawing text.
const test = require('node:test');
const assert = require('node:assert');
const { M, render, problem, text } = require('../core/i18n/messages.cjs');
const { localizePart } = require('../core/i18n/localize.cjs');
const T = require('../core/i18n/terms.cjs');

const ALLOWED = new Set(['RAFAEL', 'ELTA', 'KLA', 'ELBIT', 'DLC', 'SEE', 'NOTES', 'PAINT', 'USING', 'RAFDOCS', 'QQ', 'Plascotec', 'UNJF', 'UNF', 'UNJ', 'AS', 'RoHS']);
/** English words left after removing quoted text and tokens that contain a digit (part numbers, specs, threads). */
function englishLeft(s) {
  const stripped = String(s).replace(/"[^"]*"/g, ' ').replace(/\S*\d\S*/g, ' ');
  return (stripped.match(/[A-Za-z]{2,}/g) || []).filter((w) => !ALLOWED.has(w));
}
const V = { rc: '40.5', sheet: '2', no: '3.2', name: 'Anodize; Primer (page-level)', found: 'Aluminium 6061-T651', raw: 'AL 5052-H32', src: 'Parts list line 3', temper: 'T3', list: 'T6, T651', label: 'Silk screen', where: 'note 6', entry: 'Turning', view: '10-32UNF', cat: '310102200', type: 'heavy-duty', inner: '8-32UNC', outer: '10-32UNF', viewInsert: 'KEY-LOCKED', locking: 'non-locking', table: 10, qty: 4, uom: 'EA', want: '8-32UNC', pn: 'XY10001A', thread: '6-32UNC', alt: 'X1', seq: 3, altInner: '6-32', note: '3.1', finds: [['PRIMER', '5']], conv: '3.4', total: 6, range: '1.5 - 1.2', d: 'B', n: 2, err: 'timeout', callout: '3/8-24 UNF', drawing: 'UNF', std: 'AS5202', dash: '03', required: 'UNJF', num: '1002G151-001', desc: 'Painting instructions and colours', title: 'INSPECTION', text: '0.25', conf: 41, page: 2, norm: 'Aluminium 6061-T651', alts: ['A1'] };

test('every message key renders Hebrew with no English', () => {
  for (const k of Object.keys(M)) {
    const he = M[k].he(V) + ' ' + (M[k].sHe ? M[k].sHe(V) : '');
    assert.deepStrictEqual(englishLeft(he), [], `${k}: ${he}`);
    assert.ok(M[k].en(V).length > 0);
  }
});
test('every term table entry is Hebrew', () => {
  for (const v of [...Object.values(T.STEP), ...Object.values(T.TITLE), ...Object.values(T.DESC)]) assert.deepStrictEqual(englishLeft(v), [], v);
  for (const l of ['Anodize', 'Chem film', 'Silk screen', 'Welding', 'DLC coating']) assert.deepStrictEqual(englishLeft(T.proc(l)), [], l);
  for (const l of ['note 6', 'routing 30.1', 'step 15', 'parts list seq 3', 'parts list line 3', 'Routing chart', 'Drawing NOTES + PARTS LIST', 'PRODUCTION ROUTING CHART', 'view']) assert.deepStrictEqual(englishLeft(T.loc(l)), [], l);
});
test('localized part has no English in any He field', () => {
  const part = {
    rejectKey: { key: 'mat.notInList', vars: V }, routeSource: 'Drawing NOTES', material: { normalized: 'Aluminium 6061-T651', source: 'Note 6', raw: 'AL 6061' },
    problems: [problem('Question', 'Process', 'proc.unmapped', V), problem('Blocker', 'Threads vs inserts', 'thr.mismatch', V)].map((p) => ({ ...p, evidence: [{ source: 'view' }] })),
    refs: [{ number: 'MIL-A-8625', kind: 'public', description: 'Anodic coatings for aluminium and aluminium alloys' }, { number: 'X', kind: 'vendor', owner: 'Plascotec (coating vendor)', description: 'Coating vendor internal process — performed by the vendor (outsourced)', blocksVars: { seq: '70', title: 'INSPECTION', type: 'inspection' } }],
    tasks: [{ key: 'task.upload', vars: V, blocksVars: {} }, { key: 'task.verify', vars: V }],
    route: [{ type: 'inspection', title: 'INSPECTION', source: 'Routing chart', items: [{ key: 'route.insert', vars: V, text: 'x' }] }, { type: 'material', title: 'MATERIAL', source: 'Parts list line 2', items: [{ key: 'route.material', vars: V }] }],
  };
  localizePart(part);
  const he = [];
  (function walk(o) { for (const [k, v] of Object.entries(o)) { if (/He$/.test(k) && typeof v === 'string') he.push(v); else if (v && typeof v === 'object') walk(v); } })(part);
  assert.ok(he.length > 15);
  for (const s of he) assert.deepStrictEqual(englishLeft(s), [], s);
});
test('English rendering unchanged for legacy wording', () => {
  assert.strictEqual(render('thr.qty', { table: 10, view: 8 }, 'en').message, 'Insert quantity 10 in the table, 8 holes on the view.');
  assert.strictEqual(text('task.blocks', {}, 'en'), 'route card');
  assert.strictEqual(text('task.blocks', { seq: '15', title: '', type: 'inspection' }, 'en'), 'step 15 (inspection)');
});
module.exports = { englishLeft };
