'use strict';
// requirements/segment: one requirement text -> process records (heat treat, one per coating type, paint) + masking.
const { rx } = require('./rules.cjs');
const { sub, all } = require('./util.cjs');
const { getStandards } = require('./classify.cjs');
const F = require('./fields.cjs');
const { findCoats, coatDetail } = require('./coatings.cjs');
const { heatTreatTypes } = require('./heattreat.cjs');
const { paintTypes } = require('./paint.cjs');
const { maskRecord } = require('./masking.cjs');

function analyzeSegment(no, seg) {
  const seqs = all(rx('SEQ_RE'), seg).map((m) => m[0].toUpperCase());
  let t = sub(rx('SEQ_RE'), ' ', seg);            // "AFTER HEAT TREAT" is a sequence, not a process
  const masked = rx('MASK_RE').test(t);
  t = sub(rx('MASK_RE'), ' ', t);                 // "FREE OF PAINT" is masking, not paint
  const tt = sub(rx('TOTAL_PAREN'), ' ', t);
  const common = seqs.map((s) => 'SEQUENCE: ' + s);
  if (rx('ASM_RE').test(seg)) common.push('ASSEMBLY CONTEXT');
  if (rx('LOC_RE').test(seg)) common.push('LOCATION IN DRAWING - REVIEW');
  const recs = [], masks = [];
  const add = (process, subtype, w, extraFlags = [], kw = {}) => {
    w = w == null ? t : w;
    const s = getStandards(w);
    const fl = [...common, ...extraFlags];
    if (!s.length) fl.push('NO STANDARD');
    recs.push({ no, process, subtype, stds: s.join('; '), layer: '', detail: '', typecls: '', thick: '', coats: '', color: '', hard: '', temp: '', case: '', flags: fl.join('; '), src: seg, ...kw });
  };
  const ht = heatTreatTypes(tt);
  if (ht.length) add('Heat treat', ht.join(' + '), tt, [], { hard: F.hardness(tt), temp: F.temperature(tt), case: F.caseDepth(tt) });
  const paint = paintTypes(tt);
  let hits = findCoats(tt);
  if (!hits.length && !paint.length && /COATING|COATED/i.test(tt)) hits = [[0, 'Other / unspecified coating']];
  const n = hits.length;
  hits.forEach(([s, name], i) => {
    const a = i === 0 ? 0 : s, b = i < n - 1 ? hits[i + 1][0] : tt.length;
    const w = tt.slice(a, b); const extra = [];
    if (n > 1) { extra.push('MULTIPLE COATINGS - VERIFY FIELD ASSIGNMENT'); if (rx('LAYER_WORDS').test(tt)) extra.push('LAYER ORDER STATED IN TEXT'); }
    add('Coating', name, w, extra, { layer: n > 1 ? `${i + 1} of ${n}` : '', detail: coatDetail(name, w), typecls: F.typeClass(w), thick: F.thickness(w), color: F.colors(w) });
  });
  if (paint.length) add('Paint', paint.join(' + '), null, [], { typecls: F.typeClass(t), thick: F.thickness(t), coats: F.coats(t), color: F.colors(t), temp: F.temperature(tt) });
  if (masked) masks.push(maskRecord(no, seg, common));
  return { recs, masks };
}
module.exports = { analyzeSegment };
