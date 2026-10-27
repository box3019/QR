// Friend's notes_extractor.py breakdown -> UI sections. Every field his script outputs is listed here and rendered.
export const SECTIONS = [
  { key: 'material', kind: 'material', fields: ['family', 'alloy', 'temper', 'form', 'stds', 'dims', 'catno', 'qty', 'unit', 'src'] },
  { key: 'heat', kind: 'proc', process: 'Heat treat', fields: ['no', 'subtype', 'detail', 'stds', 'hard', 'temp', 'case', 'flags', 'src'] },
  { key: 'coatings', kind: 'proc', process: 'Coating', fields: ['no', 'subtype', 'layer', 'detail', 'stds', 'typecls', 'thick', 'coats', 'color', 'hard', 'flags', 'src'] },
  { key: 'paint', kind: 'proc', process: 'Paint', fields: ['no', 'subtype', 'layer', 'detail', 'stds', 'typecls', 'thick', 'coats', 'color', 'flags', 'src'] },
  { key: 'other', kind: 'proc', process: null, fields: ['no', 'process', 'subtype', 'layer', 'detail', 'stds', 'typecls', 'thick', 'coats', 'color', 'hard', 'temp', 'case', 'flags', 'src'] },
  { key: 'masking', kind: 'mask', fields: ['no', 'method', 'areas', 'before', 'stds', 'flags', 'src'] },
  { key: 'sequence', kind: 'summary', fields: ['heatTreat', 'masking', 'coatings', 'paint', 'flow', 'flagged'] },
];
const NAMED = new Set(SECTIONS.filter((s) => s.process).map((s) => s.process));
/** Fields shown only with Details on (long source text). */
export const DETAIL_ONLY = new Set(['src']);
/** Rows of one section for one requirements page. */
export function sectionRows(sec, page) {
  if (sec.kind === 'material') return page.material ? [page.material] : [];
  if (sec.kind === 'mask') return page.masks || [];
  if (sec.kind === 'summary') return page.summary && (page.rows || []).length ? [page.summary] : [];
  return (page.procs || []).filter((p) => (sec.process ? p.process === sec.process : !NAMED.has(p.process)));
}
/** Flag text -> known flag keys (friend's flags). */
export const FLAGS = [['MULTIPLE COATINGS', 'multi'], ['NO STANDARD', 'noStd'], ['LOCATION IN DRAWING', 'location'], ['ASSEMBLY CONTEXT', 'assembly'], ['NO COATING FOUND', 'noCoating']];
export function flagKeys(text) { const s = String(text || '').toUpperCase(); return FLAGS.filter(([k]) => s.includes(k)).map(([, v]) => v); }

/** One-line value per section (the card row). */
export function sectionLine(key, page, part) {
  const s = page.summary || {}; const m = page.material;
  if (key === 'material') return m ? [m.family, m.alloy, m.temper, m.form].filter(Boolean).join(' ') : '';
  if (key === 'heat') return s.heatTreat || '';
  if (key === 'coatings') return s.coatings || '';
  if (key === 'paint') return s.paint || '';
  if (key === 'masking') return (page.masks || []).map((k) => k.method + (k.areas ? ': ' + k.areas : '') + (k.before ? ' → ' + k.before : '')).join(' | ');
  if (key === 'sequence') { const r = (part && part.route) || []; return r.length ? r.map((x) => x.seq + ' ' + (x.title || x.type || '')).join('  ') : s.flow || ''; }
  if (key === 'other') return (page.procs || []).filter((p) => !NAMED.has(p.process)).map((p) => p.subtype || p.process).join(' | ');
  return '';
}
/** Standards named by a section's rows. */
export function sectionStds(sec, page) { return [...new Set(sectionRows(sec, page).flatMap((r) => String(r.stds || '').split(/;\s*/)).filter(Boolean))]; }
/** Flag keys raised by a section's rows. */
export function sectionFlags(sec, page) { return [...new Set(sectionRows(sec, page).flatMap((r) => flagKeys(r.flags)))]; }
/** The one action of a section: upload a missing standard, ask the customer, or confirm. */
export function sectionAction(flags, empty) { if (flags.includes('noStd')) return 'upload'; if (flags.length || empty) return 'ask'; return 'confirm'; }
/** Finds the source text on the drawing: union of tokens on the line of the best word match. tokens: [{text,x,y,w,h}]. */
export function locate(src, tokens) {
  const words = String(src || '').toUpperCase().split(/[^A-Z0-9.\-]+/).filter((w) => w.length >= 4).slice(0, 12);
  if (!words.length || !tokens || !tokens.length) return null;
  let best = null, score = 0;
  for (const tk of tokens) { const tx = String(tk.text || '').toUpperCase(); const n = words.filter((w) => tx.includes(w)).length; if (n > score) { score = n; best = tk; } }
  if (!best) return null;
  const near = tokens.filter((o) => Math.abs(o.y - best.y) < Math.max(best.h, 4) * 0.7 && words.some((w) => String(o.text || '').toUpperCase().includes(w)));
  const x0 = Math.min(...near.map((o) => o.x)), y0 = Math.min(...near.map((o) => o.y)), x1 = Math.max(...near.map((o) => o.x + o.w)), y1 = Math.max(...near.map((o) => o.y + o.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
