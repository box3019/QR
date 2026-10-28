// Checklist, live part: applies the Settings thresholds to the stored candidates, orders the groups like the route card, and derives the
// Precision level and Complexity indicators (neutral, no prices; rules documented in docs/checklist-rules.md). Pure ES module:
// used by the screens (renderer) and by the exports (main process, dynamic import).
export const DEFAULT_PRECISION = { tolMm: 0.01, tolIn: 0.0005, fitMaxIT: 7, gdtMm: 0.02, gdtIn: 0.001, raUm: 0.8, decimalsMm: 3, decimalsIn: 4 };
// default order = the route card sequence; groups: 1 material, 2 machining (+ special threads / gauges), 3 inspection & precision, 4 coating, 5 assembly, 6 final
export const GROUPS = ['material', 'machining', 'precision', 'coating', 'assembly', 'final'];
export const ROWS = [
  { id: 'material', group: 'material' },
  { id: 'heat', group: 'machining' }, { id: 'engrave', group: 'machining' }, { id: 'laser', group: 'machining' }, { id: 'engfill', group: 'machining' }, { id: 'threads', group: 'machining', sub: true }, { id: 'gauges', group: 'machining', sub: true },
  { id: 'tight', group: 'precision' },
  { id: 'coating', group: 'coating' }, { id: 'paint', group: 'coating' }, { id: 'br127', group: 'coating' },
  { id: 'assembly', group: 'assembly' },
  { id: 'inspect100', group: 'final' }, { id: 'cleanroom', group: 'final' },
];
const MM = 25.4;
const num = (v, d) => { const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return Number.isFinite(x) && x >= 0 ? x : d; };
export function thresholds(settings) {
  const p = (settings && settings.precision) || {}; const d = DEFAULT_PRECISION;
  return { tolMm: num(p.tolMm, d.tolMm), tolIn: num(p.tolIn, d.tolIn), fitMaxIT: Math.round(num(p.fitMaxIT, d.fitMaxIT)), gdtMm: num(p.gdtMm, d.gdtMm), gdtIn: num(p.gdtIn, d.gdtIn), raUm: num(p.raUm, d.raUm), decimalsMm: Math.round(num(p.decimalsMm, d.decimalsMm)), decimalsIn: Math.round(num(p.decimalsIn, d.decimalsIn)) };
}
const u2 = (unit) => (unit === 'in' ? 'in' : unit === 'mm' ? 'mm' : '');

/** Tight / unusual precise dimensions with their place: [{ kind, value, tol, unit, page, sheets, zone:{label,estimated}, bbox, note, line, ratio }]. ratio = value / limit (smaller = tighter). */
export function tightItems(chk, th) {
  const out = []; if (!chk || !chk.cand) return out; const unit = chk.unit || null; const c = chk.cand;
  const keep = (kind, x, tolText, ratio, extra = {}) => out.push({ kind, value: x.value || '', tol: tolText, unit: u2(unit), page: x.page, sheets: x.sheets, zone: x.zone || null, bbox: x.bbox || null, note: x.note, line: x.line, ratio, ...extra });
  for (const x of c.tol || []) {
    // unknown drawing unit: only what is tight in BOTH readings (<= the inch limit); never a guess
    const lim = unit === 'in' ? th.tolIn : unit === 'mm' ? th.tolMm : th.tolIn;
    if (x.half <= lim) keep('tol', x, x.text + (unit ? ' ' + unit : ''), lim ? x.half / lim : 0, { hole: !!(x.dia && x.holeCtx), dia: x.dia });
  }
  for (const x of c.fit || []) if (x.it <= th.fitMaxIT) keep('fit', x, x.fit, x.it / Math.max(1, th.fitMaxIT), { hole: x.hole && !!x.dia, dia: x.dia, fit: x.fit, it: x.it });
  for (const x of c.gdt || []) { const lim = unit === 'in' ? th.gdtIn : unit === 'mm' ? th.gdtMm : th.gdtIn; if (x.tolv <= lim) keep('gdt', { ...x, value: '' }, x.text + (unit ? ' ' + unit : ''), lim ? x.tolv / lim : 0); }
  for (const x of c.ra || []) if (x.um <= th.raUm) keep('ra', { ...x, value: '' }, x.text, th.raUm ? x.um / th.raUm : 0);
  const tolSeen = new Set([...(c.tol || []), ...(c.gdt || []), ...(c.ra || [])].flatMap((t) => (t.text.match(/\d*\.\d+|\d+/g) || [])));
  for (const x of c.dec || []) { const need = unit === 'in' ? th.decimalsIn : unit === 'mm' ? th.decimalsMm : Math.max(th.decimalsMm, th.decimalsIn); if (x.decimals >= need && !tolSeen.has(x.value)) keep('dec', x, x.decimals + ' dp', 1); }
  return out;
}

/** Precision level: Standard / Tight / Very tight (+ count, the tightest feature, one-line why). Rules: docs/checklist-rules.md */
export function precisionLevel(tight, read) {
  const strict = tight.filter((x) => x.kind !== 'dec');
  const very = strict.filter((x) => x.ratio <= 0.5 || (x.kind === 'fit' && x.it <= 6));
  const level = !tight.length ? (read ? 'standard' : 'unknown') : very.length || strict.length >= 8 ? 'veryTight' : 'tight';
  const tightest = strict.slice().sort((a, b) => a.ratio - b.ratio)[0] || tight[0] || null;
  return { level, count: tight.length, tightest, veryCount: very.length };
}
const pos = (items) => items.flatMap((i) => (i.where || []).filter((w) => w.t === 'step').map((w) => parseInt(w.n, 10))).filter(Number.isFinite);
/** Complexity: points from documented counts -> Simple / Moderate / Complex, plus the counts and a one-line why. */
export function complexity(part, ev) {
  const R = Object.fromEntries(ev.rows.map((r) => [r.id, r]));
  const yes = (id) => R[id] && R[id].state === 'yes';
  const keys = (id) => [...new Set(((R[id] && R[id].items) || []).map((i) => i.key))];
  const steps = (part.route || []).filter((s) => s.type !== 'material' && s.type !== 'packing' && !s.empty).length;
  const coatings = (yes('coating') ? keys('coating').length : 0) + (yes('paint') ? 1 : 0) + (yes('br127') ? 1 : 0);
  const asmKinds = yes('assembly') ? keys('assembly').length : 0; const asmQty = yes('assembly') ? R.assembly.items.reduce((n, i) => n + (i.qty || 1), 0) : 0;
  const threads = yes('threads') ? R.threads.items.length : 0;
  const special = ['heat', 'engrave', 'laser', 'engfill'].filter(yes).length;
  const tightN = ev.tight.length;
  const points = Math.min(steps, 12) + 2 * coatings + asmKinds + 2 * Math.min(threads, 3) + special + Math.min(5, Math.floor(tightN / 2)) + (yes('cleanroom') ? 1 : 0) + (yes('inspect100') ? 1 : 0) + (yes('gauges') ? 1 : 0);
  const level = points >= 12 ? 'complex' : points >= 6 ? 'moderate' : 'simple';
  return { level, points, counts: { steps, coatings, asmKinds, asmQty, threads, special, tight: tightN } };
}
const sortKey = (ev, part) => {
  // order the groups by the part's own routing steps when the chart gives positions; otherwise the default route-card order
  const per = {}; for (const g of GROUPS) per[g] = []; for (const r of ev.rows) if (r.group) per[r.group].push(...pos(r.items || []));
  const any = GROUPS.filter((g) => per[g].length).length >= 2; if (!any) return GROUPS;
  let last = 0; const key = {}; GROUPS.forEach((g, i) => { if (per[g].length) { key[g] = Math.min(...per[g]); last = key[g]; } else key[g] = last + 0.001 * (i + 1); });
  return GROUPS.slice().sort((a, b) => key[a] - key[b] || GROUPS.indexOf(a) - GROUPS.indexOf(b));
};

/** Everything the screens and exports show for one part. */
export function evaluate(part, settings) {
  const chk = part && part.checklist; const th = thresholds(settings);
  if (!chk) return { th, has: false, rows: ROWS.map((r) => ({ ...r, state: 'notfound', items: [] })), tight: [], order: GROUPS, precision: { level: 'unknown', count: 0, tightest: null, veryCount: 0 }, complexity: { level: 'simple', points: 0, counts: {} } };
  const tight = tightItems(chk, th); const ok = !!(chk.read && chk.read.ok);
  const rows = ROWS.map((r) => {
    const base = chk.rows && chk.rows[r.id];
    if (r.id === 'tight') return { ...r, state: tight.length ? 'yes' : ok ? 'no' : 'notfound', items: tight };
    if (r.id === 'gauges') {
      const items = [...((base && base.items) || [])];
      for (const x of (chk.rows.threads && chk.rows.threads.items) || []) items.push({ key: 'gauge-thread', spec: x.spec, where: x.where, page: x.page, sheets: x.sheets, zone: x.zone, bbox: x.bbox, derived: 'threads', line: x.line });
      for (const x of tight.filter((t) => t.hole && t.dia)) items.push({ key: 'gauge-bore', spec: '\u00D8' + x.dia + ' ' + x.tol, where: [{ t: 'page', n: String(x.page) }], page: x.page, sheets: x.sheets, zone: x.zone, bbox: x.bbox, derived: 'fit', line: x.line });
      return { ...r, state: items.length ? 'yes' : (base ? base.state : 'notfound'), items };
    }
    return { ...r, ...(base || { state: 'notfound', items: [] }) };
  });
  const ev = { th, has: true, rows, tight, read: chk.read, zoneEstimated: tight.some((x) => x.zone && x.zone.estimated) };
  ev.order = sortKey(ev, part); ev.precision = precisionLevel(tight, ok); ev.complexity = complexity(part, ev);
  return ev;
}
