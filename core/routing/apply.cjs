'use strict';
// routing/apply: routing chart -> the part. Finds the chart (OCR'd ruled box, requirements-port table, or plain text), builds the clean
// material, and adds the chart's treatments to the requirements pages in the friend's shape, so the part card shows them without new UI.
const { chartFromRows, chartFromText, chartFromRequirements, extraStageNote } = require('./chart.cjs');
const { parseMaterial } = require('../catalog/families.cjs');

const HEADER_RE = /PRODUCTION\s+ROUTING\s+(CHART|TABLE)|\bROUTING\s+(CHART|TABLE)\b/i;
const good = (c) => c && c.ops && c.ops.length >= 2 ? c : null;
/** -> { chart, source: 'ocr'|'requirements'|'text', page } | null. pages: pipeline pages (p.chart set when the ruled chart was OCR'd). */
function findChart({ pages = [], requirements = [], text = '' }) {
  for (const p of pages) if (p.chart) {
    const c = good(chartFromRows(p.chart.rows || [])) || good(chartFromText(p.chart.text || ''));
    if (c) return { chart: c, source: 'ocr', page: p.n };
  }
  const r = good(chartFromRequirements(requirements));
  if (r) { const pg = requirements.find((p) => /^ROUTING TABLE/.test(p.source || '')); return { chart: r, source: 'requirements', page: pg ? pg.page : 1 }; }
  for (const p of pages) { const c = HEADER_RE.test(p.raw || '') && good(chartFromText(p.raw)); if (c) return { chart: c, source: 'text', page: p.n }; }
  return null;
}
/** Chart material -> the analyzer's material candidate (clean raw text, stock size, cat no). null when the chart has none. */
function materialFromChart(chart) {
  const m = chart && chart.material; if (!m || !m.raw) return null;
  return { raw: m.raw, source: 'Routing chart ' + m.no, catalogNo: m.catNo || undefined, qty: m.qty, uom: m.uom || '', stock: m.stock || null, conf: 1 };
}
const num = (v) => (v == null ? '' : String(v));
const specText = (s) => s.raw || s.id;
const typeCls = (s) => [s.type && 'Type ' + s.type, s.class && 'Class ' + s.class, s.grade && 'Grade ' + s.grade].filter(Boolean).join('; ');
/** Treatment kind -> the friend's { process, subtype } vocabulary. */
function procOf(t) {
  switch (t.kind) {
    case 'plating': return { process: 'Coating', subtype: t.process || 'Plating' };
    case 'anodize': return { process: 'Coating', subtype: 'Anodize' };
    case 'conversion': return { process: 'Coating', subtype: 'Conversion coating (chem film)' };
    case 'passivation': return { process: 'Coating', subtype: 'Passivation' };
    case 'coating': return { process: 'Coating', subtype: 'Coating' };
    case 'paint': return { process: 'Paint', subtype: 'Top coat / paint' };
    case 'heat': return { process: 'Heat treat', subtype: 'Heat treat' };
    case 'blasting': return { process: 'Other', subtype: /GLASS/i.test(t.text) ? 'Glass bead blast' : 'Blasting' };
    default: return { process: 'Other', subtype: t.process || 'Surface treatment' };
  }
}
const procRow = (t) => {
  const { process, subtype } = procOf(t); const s0 = (t.specs || [])[0] || {};
  return { no: t.no, process, subtype, layer: '', detail: t.text, stds: (t.specs || []).map(specText).join('; '), typecls: (t.specs || []).map(typeCls).filter(Boolean).join('; '), thick: t.thickness ? t.thickness.text : '', coats: '', color: '', hard: '', temp: '', case: '', flags: !(t.specs && t.specs.length) && /^(plating|anodize|conversion|passivation|coating|paint)$/.test(t.kind) ? 'NO STANDARD' : '', src: t.text, chart: true };
};
/** Material row of a requirements page, from the chart material + parsed alloy. */
function materialRow(m) {
  const p = parseMaterial(m.raw); const st = m.stock;
  const dims = st ? [st.l, st.w, st.t].filter((x) => x != null).join('\u00d7') + (st.unit ? ' ' + st.unit : '') : '';
  return { family: p ? p.family : '', alloy: p ? p.grade : '', temper: p ? p.temper : '', form: p ? p.form : '', stds: (p ? p.specs : []).join('; '), dims, catno: m.catNo || '', qty: num(m.qty), unit: m.uom || '', src: m.raw, chart: true };
}
/**
 * Adds the chart's material and treatments to the requirements page they were read from (a new page when the port found none).
 * The friend's own rows win: a chart treatment is added only when no row of his has its number or its spec.
 * Returns a new array; the input is not modified.
 */
function enrichRequirements(requirements, ci) {
  if (!ci) return requirements;
  const { chart, source, page } = ci;
  const out = requirements.map((p) => ({ ...p }));
  let pg = out.find((p) => p.page === page);
  if (!pg) { pg = { page, status: 'OK', source: 'ROUTING CHART', rows: [], procs: [], masks: [], material: null, summary: null }; out.push(pg); }
  pg.procs = (pg.procs || []).slice();
  const mine = pg.procs;
  for (const t of chart.treatments) {
    const row = procRow(t);
    const dup = mine.some((q) => (q.no && q.no === row.no) || (row.stds && q.stds && row.stds.split('; ').every((x) => q.stds.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(x.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^SAE/, '')))));
    if (!dup) mine.push(row);
  }
  mine.sort((a, b) => String(a.no).localeCompare(String(b.no), undefined, { numeric: true }));
  if (chart.material && !pg.material) pg.material = materialRow(chart.material);
  // summary lines the card prints; only empty ones are filled
  const sum = { heatTreat: '', masking: '', coatings: '', paint: '', flow: '', flagged: 0, ...(pg.summary || {}) };
  const names = (proc) => mine.filter((q) => q.process === proc).map((q) => q.subtype + (q.stds ? ' [' + q.stds.split('; ')[0] + ']' : '')).join(' \u2192 ');
  if (!sum.coatings) sum.coatings = names('Coating');
  if (!sum.heatTreat) sum.heatTreat = names('Heat treat');
  if (!sum.paint) sum.paint = names('Paint');
  if (!sum.flow) sum.flow = mine.map((q) => q.subtype).join(' \u2192 ');
  pg.summary = sum;
  if (!(pg.rows || []).length) pg.rows = chart.ops.flatMap((o) => o.items.map((i) => ({ no: i.no, section: o.no + ' ' + o.name, text: i.text, extra: i.extra || '', cat: '' })));
  return out;
}
/** Extra fields kept on the part: everything the chart says that has no home elsewhere (treatments, specs, inspection, packing, notes). */
function chartExtras(ci, text) {
  if (!ci) return null;
  const c = ci.chart; const stage = extraStageNote(text) || (c.machiningAfter ? { rc: c.machiningAfter.no } : null);
  return { source: ci.source, page: ci.page, ops: c.ops.map((o) => ({ no: o.no, name: o.name, kind: o.kind })), treatments: c.treatments, specs: c.specs, inspection: c.inspection, packing: c.packing, notes: c.notes, machiningAfter: c.machiningAfter ? { ...c.machiningAfter, rc: (stage && stage.rc) || c.machiningAfter.no } : (stage ? { no: stage.rc, rc: stage.rc, text: '', sheet: '' } : null) };
}
module.exports = { findChart, materialFromChart, enrichRequirements, chartExtras, procOf };

