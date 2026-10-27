// Part card blocks: pure logic (no UI). One block per standard callout and per requirement field.
// A block: { id, kind, status: 'bad'|'warn'|'ok'|'none', title|titleKey, line: { key, vars }, value, action: null|{ kind, ... }, details }.
// Order: needs action first (red, then yellow), green last, grey "not on drawing" at the very end.
import { SECTIONS, sectionRows, sectionLine, sectionFlags, sectionStds, cardPages } from './breakdown.mjs';

export const STATUS_ORDER = { bad: 0, warn: 1, ok: 2, none: 3 };
const FLAG_LABEL = { size: 'blk.f.size', series: 'blk.f.series', class: 'blk.f.class' };

/** Standards found on the drawing -> blocks. */
export function standardBlocks(part) {
  return (part.standards || []).filter((s) => s.kind !== 'thread').map((s) => {
    const mism = (s.flags || []).filter((f) => f.type !== 'newerRev');
    const id = 'std:' + (s.id || s.std + s.dash);
    const title = s.std + (s.dash ? '-' + s.dash : '');
    let status, line, action = null;
    if (s.status === 'needsDoc') { status = 'warn'; line = { key: 'blk.std.needsDoc' }; action = { kind: 'upload', std: s }; }
    else if (mism.length) { status = 'bad'; line = { key: 'blk.std.differs', vars: { what: mism.map((f) => FLAG_LABEL[f.type]).filter((v, i, a) => v && a.indexOf(v) === i) } }; action = { kind: 'ask' }; }
    else if (s.status === 'needsConfirm') { status = 'warn'; line = { key: 'blk.std.confirm' }; action = { kind: 'confirm', std: s }; }
    else { status = 'ok'; line = { key: 'blk.std.ok' }; }
    return { id, kind: 'standard', status, title, line, action, std: s, details: { type: 'standard', flags: mism, dims: s.dims || null, doc: s.doc || null, newerRev: (s.doc && s.doc.newerRev) || '', thread: s.thread || null } };
  });
}

/** Requirement fields (material, heat treat, coatings, paint, other, masking, sequence) -> blocks. Empty ones are merged into one grey block. */
export function fieldBlocks(part) {
  const out = []; const none = [];
  const pages = cardPages(part);
  for (const pg of pages) for (const sec of SECTIONS) {
    const rows = sectionRows(sec, pg);
    if (!rows.length) { if (!none.includes(sec.key)) none.push(sec.key); continue; }
    const fl = sectionFlags(sec, pg); let value = sectionLine(sec.key, pg, part);
    const steps = sec.key === 'sequence' ? ((part.route || []).length) : 0;
    const id = `f:${pg.page}:${sec.key}`;
    let status = 'ok', line = null, action = { kind: 'confirm', ok: id };
    if (sec.key === 'sequence') { value = null; if (steps) line = { key: 'blk.route', vars: { n: steps } }; else { if (!none.includes(sec.key)) none.push(sec.key); continue; } }
    if (fl.includes('noStd')) { status = 'warn'; line = { key: 'blk.noStd' }; action = { kind: 'upload', task: true }; }
    else if (fl.length) { status = 'warn'; line = { key: 'blk.flags', vars: { flags: fl.map((k) => 'bd.flag.' + k) } }; action = { kind: 'ask' }; }
    out.push({ id, kind: 'field', status, titleKey: 'bd.s.' + sec.key, page: pages.length > 1 ? pg.page : null, value, line, action, sec, pg, details: { type: 'fields', sec, pg, rows } });
  }
  // material missing is a question, not "not on drawing"
  const mi = none.indexOf('material');
  if (pages.length && mi >= 0) { none.splice(mi, 1); out.unshift({ id: 'f:material', kind: 'field', status: 'warn', titleKey: 'bd.s.material', line: { key: 'blk.noMaterial' }, action: { kind: 'ask' }, details: null }); }
  if (!pages.length) out.unshift({ id: 'f:material', kind: 'field', status: 'warn', titleKey: 'bd.s.material', line: { key: 'blk.noMaterial' }, action: { kind: 'ask' }, details: null });
  if (none.length) out.push({ id: 'f:none', kind: 'none', status: 'none', titleKey: 'blk.none', line: { key: 'blk.noneList', vars: { list: none.filter((k) => k !== 'other').map((k) => 'bd.s.' + k) } }, action: null, details: null });
  return out;
}

/** Open customer questions (non-info problems) and the "not our material / process" verdict. */
export function verdictBlocks(part) {
  const out = [];
  const open = (p) => p.status !== 'resolved';
  const probs = (part.problems || []).filter((p) => p.severity !== 'Info' && open(p) && p.key !== 'std.thread'); // std.thread is shown once, in its standard block
  if (part.status === 'rejected' || (part.problems || []).some((p) => open(p) && p.internal)) out.push({ id: 'verdict', kind: 'verdict', status: 'bad', titleKey: 'blk.notOurs', rejectReason: true, line: { key: 'blk.notOursLine' }, action: null, details: null });
  if (probs.length) out.push({ id: 'questions', kind: 'questions', status: 'warn', titleKey: 'blk.questions', line: { key: 'blk.questionsLine', vars: { n: probs.length } }, action: { kind: 'ask' }, details: { type: 'problems', list: probs } });
  return out;
}

/** All blocks for a part, sorted. */
export function buildBlocks(part) {
  const all = [...verdictBlocks(part), ...standardBlocks(part), ...fieldBlocks(part)];
  return all.map((b, i) => ({ b, i })).sort((x, y) => STATUS_ORDER[x.b.status] - STATUS_ORDER[y.b.status] || x.i - y.i).map((x) => x.b);
}
/** true when nothing needs attention (every block ok or grey). */
export const allGood = (blocks) => blocks.length > 0 && blocks.every((b) => b.status === 'ok' || b.status === 'none');
