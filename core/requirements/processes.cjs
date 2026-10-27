'use strict';
// requirements/processes: all requirement rows -> process records + masking records (page level).
const { rx } = require('./rules.cjs');
const { uniq } = require('./util.cjs');
const { getStandards } = require('./classify.cjs');
const { analyzeSegment } = require('./segment.cjs');

function extractProcesses(rows) {
  const out = [], masks = [];
  for (const r of rows) {
    const text = r.text;
    if (r.cat.includes('Material') && !rx('STRONG_RE').test(text)) continue;   // plain material rows are not processes
    const segs = text.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!segs.length) continue;
    const items = [];
    if (segs.length > 1) {                                                     // header line + lettered sub-items (A., B., C.)
      if (getStandards(segs[0]).length || rx('THK_RE').test(segs[0])) items.push([r.no, segs[0]]);
      for (const s of segs.slice(1)) { const m = s.match(rx('LETTER')); items.push([r.no + (m ? m[1] : ''), m ? m[2] : s]); }
    } else items.push([r.no, segs[0]]);
    for (const [no, seg] of items) { const { recs, masks: ms } = analyzeSegment(no, seg); out.push(...recs); masks.push(...ms); }
  }
  const names = uniq(out.filter((p) => p.process === 'Coating' || p.process === 'Paint').map((p) => p.subtype));
  for (const m of masks) if (!m.before) { if (names.length) m.before = names.join(' | ') + ' (page-level)'; else m.flags = (m.flags ? m.flags + '; ' : '') + 'NO COATING FOUND ON PAGE'; }
  return { procs: out, masks };
}
module.exports = { extractProcesses };
