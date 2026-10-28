'use strict';
// Checklist for the exports (PDF report, Excel): plain text built from the evaluated view p._ck (main attaches it with core/checklist/live.mjs).
const LAB = require('./labels.json');
const COLS = ['material', 'heat', 'engrave', 'laser', 'engfill', 'threads', 'gauges', 'tight', 'coating', 'paint', 'br127', 'assembly', 'inspect100', 'cleanroom'];
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''));
const mk = (lang) => { const d = LAB[lang === 'he' ? 'he' : 'en']; const tt = (k, v) => (d[k] != null ? fill(d[k], v) : k); return tt; };
const TIGHT = ['tol', 'fit', 'gdt', 'ra', 'dec'];
function what(i, tt) {
  if (i.kind && TIGHT.includes(i.kind)) return [tt('ck.t.' + i.kind), i.value, i.tol].filter(Boolean).join(' ');
  const base = tt('ck.k.' + i.key); const b = base === 'ck.k.' + i.key ? i.key : base;
  const spec = i.key === 'material' ? i.spec : i.spec && i.spec !== b ? i.spec : '';
  const col = i.color ? (tt('ck.color.' + i.color) === 'ck.color.' + i.color ? i.color : tt('ck.color.' + i.color)) : '';
  return [i.key === 'material' ? '' : b, spec, i.qty ? '\u00D7' + i.qty : '', col].filter(Boolean).join(' \u00B7 ');
}
function where(i, tt) {
  const o = [];
  if (i.page && (i.sheets || 1) > 1) o.push(tt('ck.sheet', { n: i.page }));
  if (i.zone) o.push(tt('ck.zone', { z: i.zone.label }) + (i.zone.estimated ? ' (' + tt('ck.est') + ')' : ''));
  if (i.kind) return o.join(' \u00B7 ');
  for (const w of i.where || []) { if (w.t === 'note') o.push(tt('ck.note', { n: w.n })); else if (w.t === 'step') o.push(tt('ck.step', { n: w.n })); else if (w.t === 'bom') o.push(tt('ck.bom')); else if (w.t === 'title') o.push(tt('ck.title_block')); }
  return [...new Set(o)].join(' \u00B7 ');
}
function indicators(ev, lang) {
  const tt = mk(lang), k = ev.complexity.counts || {}, p = ev.precision;
  const tightest = p.tightest ? [what(p.tightest, tt), where(p.tightest, tt)].filter(Boolean).join(' \u2014 ') : '';
  return { precision: tt('ck.prec.' + p.level), precisionWhy: p.level === 'unknown' ? tt('ck.prec.whyUnknown') : p.level === 'standard' ? tt('ck.prec.whyStandard') : tt('ck.prec.why', { n: p.count, x: tightest }),
    complexity: tt('ck.cx.' + ev.complexity.level), complexityWhy: tt('ck.cx.why', { steps: k.steps || 0, coat: k.coatings || 0, asm: k.asmKinds || 0, thr: k.threads || 0, tight: k.tight || 0 }) };
}
/** [{ group, id, label, state, stateLabel, what, where }] in the part's group order (route-card sequence). */
function lines(ev, lang) {
  const tt = mk(lang); const out = [];
  for (const g of ev.order) for (const r of ev.rows.filter((x) => x.group === g)) {
    const items = r.items || [];
    out.push({ group: g, groupLabel: tt('ck.g.' + g), id: r.id, label: tt('ck.r.' + r.id), state: r.state, stateLabel: tt('ck.' + r.state), sub: !!r.sub, excluded: !!r.excluded,
      what: items.slice(0, 12).map((i) => what(i, tt)).join('; ') + (items.length > 12 ? '; ' + tt('ck.more', { n: items.length - 12 }) : ''), where: [...new Set(items.slice(0, 12).map((i) => where(i, tt)).filter(Boolean))].join('; ') });
  }
  return out;
}
/** One summary cell per column, e.g. "Yes: Keensert M5X0.8 x4 [zone B2]". */
function cell(ev, id, lang) { const tt = mk(lang); const r = ev.rows.find((x) => x.id === id); if (!r) return ''; const w = lines({ ...ev, order: [r.group], rows: [r] }, lang)[0]; return [w.stateLabel + (w.excluded ? ' (' + tt('ck.excluded') + ')' : ''), w.what, w.where ? '[' + w.where + ']' : ''].filter(Boolean).join(': ').replace(': [', ' ['); }
const colLabel = (id, lang) => mk(lang)('ck.r.' + id);
module.exports = { COLS, lines, indicators, cell, colLabel, what, where, mk };
