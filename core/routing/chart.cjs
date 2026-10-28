'use strict';
// routing/chart: generic parser for a "PRODUCTION ROUTING CHART" / "ROUTING CHART" table (RAFAEL format: NO. | DESCRIPTION | OPER. | DATE).
// Operations are classified by their PRINTED NAME, not by their number, so charts that number SURFACE TREATMENT 40 or 50 both work.
// Input is rows (from the OCR chart reader or the requirements port) or plain text lines; output is a structured chart:
// material (+ stock size, cat no, qty, unit), treatments (each with its process kind and specs), inspection / packing notes,
// the operation sequence, the "machining after surface treatment" stage, and every spec number found.

const OP_KINDS = [
  ['material', /\b(RAW\s+)?MATERIAL\b/],
  ['heat', /HEAT\s*TREAT/],
  ['surface', /SURFACE\s+TREATMENT|\bFINISH|PLATING|COATING|PAINT|ANODI[ZS]|PASSIVAT|CONVERSION/],
  ['inserts', /INSERT/],
  ['marking', /MARKING|LABEL|ENGRAV/],
  ['inspection', /INSPECTION|QUALITY|TESTING|\bTEST\b/],
  ['packing', /PACKING|PACKAGING|PRESERVATION/],
  ['approval', /APPROVAL/],
  ['general', /GENERAL/],
  ['machining', /MACHINING|MILLING|TURNING|CNC|DRILLING|GRINDING/],
];
const opKind = (name) => { const u = String(name || '').toUpperCase(); for (const [k, re] of OP_KINDS) if (re.test(u)) return k; return 'other'; };

// process kind of one row inside a surface-treatment (or heat) operation; first match wins
const PROC_KINDS = [
  ['dimNote', /DIMENSIONS?\s+ARE\s+AFTER|AFTER\s+(THE\s+)?(SURFACE\s+TREATMENTS?|PLATING|COATING)\b.*\bDIMENSION/],
  ['machiningAfter', /FINAL\s+MACHINING|MACHINING\s+AFTER/],
  ['blasting', /(SAND|GRIT|BEAD|SHOT|GLASS)\s*-?\s*BLAST|MICRO\s*-?\s*BEAD|BLASTING|PEENING/],
  ['anodize', /ANODI[ZS]/],
  ['conversion', /ALODINE|CHEMICAL\s+CONVERSION|CHROMATE|IRIDITE|CONVERSION\s+COAT/],
  ['passivation', /PASSIVAT/],
  ['plating', /ELECTROLESS\s+NICKEL|NICKEL\s+PLAT|(SILVER|GOLD|CHROM(E|IUM)|ZINC|TIN|CADMIUM|COPPER|RHODIUM)\s+PLAT|ELECTROPLAT|PLATING/],
  ['paint', /PAINT|PRIMER|TOP\s*COAT|POWDER\s+COAT/],
  ['heat', /HEAT\s*TREAT|HARDEN|ANNEAL|AGING|SOLUTION\s+TREAT|STRESS\s+RELIEF/],
  ['coating', /COATING|DLC|PVD|XYLAN|\bNICKEL\b/],
  ['mask', /MASK/],
];
const PLATING_NAMES = [[/ELECTROLESS\s+NICKEL/, 'Electroless nickel'], [/SILVER/, 'Silver plating'], [/GOLD/, 'Gold plating'], [/CHROM/, 'Chrome plating'], [/ZINC/, 'Zinc plating'], [/TIN\b/, 'Tin plating'], [/CADMIUM/, 'Cadmium plating'], [/COPPER/, 'Copper plating'], [/NICKEL/, 'Nickel plating']];
const procKind = (t) => { const u = String(t || '').toUpperCase(); for (const [k, re] of PROC_KINDS) if (re.test(u)) return k; return 'other'; };

/** OCR slips inside spec numbers: S->5 and O->0 between digits, I/l->1. Only touches tokens that look like a standard number. */
function fixSpecDigits(text) {
  return String(text || '').replace(/\b(GS|PS|SAE-AMS|AMS|MIL|ASTM|ISO|DIN|QQ|NAS|MS|AS)([- ]?[A-Z]?[- ]?)([0-9A-Z.\/-]{3,14})\b/g, (m, a, b, c) => {
    const fixed = c.replace(/(?<=\d)[S](?=\d)/g, '5').replace(/(?<=\d)[O](?=\d)/g, '0').replace(/(?<=\d)[Il](?=\d)/g, '1');
    return a + b + fixed;
  });
}
const µ = (t) => String(t).replace(/(\d)\s*(?:ym|um|µm|μm)\b/gi, '$1 µm');

const SPEC_RES = [
  /\bSAE[- ]?AMS[- ]?(?:[A-Z]-)?\d{3,5}[A-Z]?(?:\/\d+)?/g,
  /\bAMS[- ]?(?:[A-Z]{1,3}-)?\d{3,5}[A-Z]?(?:\/\d+)?/g,
  /\bMIL-[A-Z]{1,4}-\d+[A-Z]?(?:\/\d+)?/g,
  /\bASTM\s*[A-Z]\s*\d{2,4}(?:\s*-\s*\d{2})?/g,
  /\bQQ-[A-Z]-\d+(?:\/\d+)?/g,
  /\bISO\s*\d{3,6}(?:-\d+)?/g,
  /\bDIN\s*(?:EN\s*)?\d{2,6}/g,
  /\b(?:NAS|NASM|MS|AS)\s*\d{3,6}\b/g,
  /\bGS-\d[A-Z]\d{4,5}\b/g,
  /\bPS-\d+\.\d+\b/g,
  /\bGEN_\d+-\d+\b/g,
  /\bRAFDOCS-\d+\b/g,
];
const normSpec = (s) => String(s).replace(/\s+/g, ' ').replace(/^(ASTM [A-Z])\s*(\d)/, '$1$2').replace(/\s*-\s*(\d{2})$/, '-$1').trim();
/** Spec numbers in a text, in order, normalised (ASTM B 700-08 -> ASTM B700-08), with Class / Type / Grade qualifiers. */
function extractSpecs(text) {
  const t = fixSpecDigits(String(text || '').toUpperCase());
  const found = [];
  for (const re of SPEC_RES) { re.lastIndex = 0; for (const m of t.matchAll(re)) found.push({ i: m.index, end: m.index + m[0].length, raw: normSpec(m[0]) }); }
  found.sort((a, b) => a.i - b.i || b.end - a.end);
  const out = [];
  for (const f of found) {
    if (out.some((o) => f.i >= o.i && f.i < o.end)) continue; // inside a longer match (AMS inside SAE-AMS)
    out.push({ ...f, id: f.raw.replace(/^SAE-/, '') });
  }
  const q = (re) => { const m = t.match(re); return m ? m[1] : ''; };
  const cls = q(/\bCLASS\s+([A-Z0-9]+)/), type = q(/\bTYPE\s+([A-Z0-9]+)/), grade = q(/\bGRADE\s+([A-Z0-9]+)/);
  const seen = new Set();
  return out.filter((o) => (seen.has(o.id) ? false : seen.add(o.id))).map((o) => {
    const ym = o.raw.match(/-(\d{2})$/);
    return { id: ym && /^ASTM/.test(o.id) ? o.id.replace(/-\d{2}$/, '') : o.id, raw: o.raw, year: ym && /^ASTM/.test(o.id) ? ym[1] : '', class: cls, type, grade };
  });
}

const UNIT = '(?:µm|um|ym|MICRONS?|MILS?|MM|INCH(?:ES)?|IN)';
function thicknessOf(text) {
  const t = µ(String(text || '')).replace(/µm/g, 'µm');
  let m = t.match(/(\d+(?:\.\d+)?)\s*(?:-|TO|–)\s*(\d+(?:\.\d+)?)\s*(µm|MICRONS?|MILS?|MM|INCH(?:ES)?)/i);
  if (m) return { min: +m[1], max: +m[2], unit: /micron/i.test(m[3]) ? 'µm' : m[3].replace('MILS', 'MIL') , text: `${m[1]}-${m[2]} ${/micron/i.test(m[3]) ? 'µm' : m[3]}` };
  m = t.match(/(\d+(?:\.\d+)?)\s*(µm|MICRONS?|MILS?|MM)\s+THICK/i);
  if (m) return { min: +m[1], max: +m[1], unit: m[2], text: `${m[1]} ${m[2]}` };
  return null;
}
const stockOf = (text) => {
  const t = String(text || '').toUpperCase();
  const g = (k) => { const m = t.match(new RegExp('(?<![A-Z])' + k + '\\s*=\\s*(\\d+(?:\\.\\d+)?)')); return m ? +m[1].toString() : null; };
  const L = g('L'), W = g('W'), T = g('T'), D = g('(?:D|DIA|OD)');
  if (L == null && W == null && T == null && D == null) return null;
  const u = (t.match(/\b(INCH(?:ES)?|IN|MM|CM)\b/) || [])[1] || '';
  return { l: L, w: W, t: T, d: D, unit: /^IN/.test(u) ? 'inch' : u.toLowerCase() };
};
const CATNO_RE = /\b(\d{9,10})\s+(\d+(?:\.\d+)?)\s+(KG|EA|PC|PCS|M|MM|LB|G|L)\b/;

const normRows = (rows) => rows.map((r) => ({ no: String(r.no || '').trim(), text: fixSpecDigits(String(r.text || '')).replace(/\s+/g, ' ').trim(), extra: String(r.extra || '').trim() }));

/** Rows [{no, text, extra?}] (sections have no dot) -> chart. */
function chartFromRows(rows0) {
  const rows = normRows(rows0).filter((r) => /^\d{1,3}(\.\d{1,2})?$/.test(r.no));
  if (!rows.length) return null;
  const ops = []; let cur = null;
  for (const r of rows) {
    if (!r.no.includes('.')) { cur = { no: r.no, name: r.text.replace(/^[A-H]\s+/, ''), kind: opKind(r.text), items: [] }; ops.push(cur); continue; }
    const g = r.no.split('.')[0];
    if (!cur || cur.no !== g) { cur = ops.find((o) => o.no === g) || (ops.push({ no: g, name: '', kind: 'other', items: [] }), ops[ops.length - 1]); }
    cur.items.push({ no: r.no, text: µ(r.text), extra: r.extra });
  }
  const chart = { ops: ops.map((o) => ({ no: o.no, name: o.name, kind: o.kind, items: o.items })), material: null, treatments: [], inspection: [], packing: [], notes: [], machiningAfter: null, specs: [] };
  const addSpecs = (text, ctx) => { for (const s of extractSpecs(text)) { const e = chart.specs.find((x) => x.id === s.id); if (e) { if (!e.where.includes(ctx)) e.where.push(ctx); } else chart.specs.push({ ...s, where: [ctx] }); } };
  for (const o of ops) {
    for (const it of o.items) {
      const full = it.text + (it.extra ? ' ' + it.extra : '');
      const specs = extractSpecs(full);
      addSpecs(full, it.no);
      if (o.kind === 'material') {
        const c = (full.match(CATNO_RE) || []);
        const desc = full.replace(CATNO_RE, '').replace(/\s+/g, ' ').replace(/[,\s]+$/, '').trim();
        if (/\b(OTHER|ALTERNATE?)\b.*\b(SIZE|SHAPE|MATERIAL)\b|\bAPPROVED\b/.test(desc.toUpperCase()) && chart.material) { chart.notes.push({ no: it.no, kind: 'altStock', text: it.text }); continue; }
        if (chart.material) { chart.notes.push({ no: it.no, kind: 'material', text: it.text }); continue; }
        chart.material = { no: it.no, raw: desc, stock: stockOf(desc), catNo: c[1] || (full.match(/\b(\d{9,10})\b/) || [])[1] || '', qty: c[2] ? +c[2] : null, uom: c[3] || '', specs: specs.map((s) => s.id) };
        continue;
      }
      if (o.kind === 'surface' || o.kind === 'heat') {
        const kind = procKind(it.text);
        if (kind === 'dimNote') { chart.notes.push({ no: it.no, kind: 'dimAfterTreatment', text: it.text }); continue; }
        if (kind === 'machiningAfter') { chart.machiningAfter = { no: it.no, text: it.text, sheet: (it.text.match(/SHEET\s+(\d+)/i) || [])[1] || '' }; continue; }
        const pname = kind === 'plating' ? (PLATING_NAMES.find(([re]) => re.test(it.text.toUpperCase())) || [0, 'Plating'])[1] : '';
        chart.treatments.push({ no: it.no, kind: o.kind === 'heat' && kind === 'other' ? 'heat' : kind, process: pname, text: it.text, specs, thickness: thicknessOf(it.text), area: /SPECIFIED\s+AREA/i.test(it.text) ? 'specified area' : '' });
        continue;
      }
      if (o.kind === 'inspection') { chart.inspection.push({ no: it.no, text: it.text, specs }); continue; }
      if (o.kind === 'packing') { chart.packing.push({ no: it.no, text: it.text, specs }); continue; }
      chart.notes.push({ no: it.no, kind: o.kind, text: it.text });
    }
  }
  return chart;
}

const HEADER_RE = /PRODUCTION\s+ROUTING\s+(CHART|TABLE)|\bROUTING\s+(CHART|TABLE)\b/i;
const STOP_RE = /^(TOLERANCES\b|UNLESS OTHERWISE|DRILL\b|\bX THD\b|SIGNATURE\b|REVISIONS?\b)/i;
/** Plain text (page text or the OCR chart text) -> rows -> chart. Returns null when there is no routing chart header. */
function chartFromText(text) {
  const raw = String(text || '');
  const m = raw.match(HEADER_RE); if (!m) return null;
  const lines = raw.slice(m.index).split('\n').map((s) => s.trim()).slice(1);
  const rows = []; let cur = null;
  for (const l of lines) {
    if (STOP_RE.test(l)) break;
    const r = l.match(/^(\d{1,3}(?:\.\d{1,2})?)\s+(\S.*)$/);
    if (r && !/^\d+\.?\d*\s*(MM|INCH|KG)\b/i.test(r[2])) { cur = { no: r[1], text: r[2] }; rows.push(cur); continue; }
    if (!cur || /^(NO\.?|DESCRIPTION|OPER\.?|DATE)(\s+(DESCRIPTION|OPER\.?|DATE|CAT NO|QTY|UM))*$/i.test(l)) continue;
    if (l.length > 2) cur.text += ' ' + l;
  }
  return chartFromRows(rows);
}
/** requirements port results (analyzeFile) -> chart (only ROUTING TABLE pages). */
function chartFromRequirements(results) {
  const rows = [];
  for (const p of results || []) {
    if (!/^ROUTING TABLE/.test(p.source || '')) continue;
    const seen = new Set();
    for (const r of p.rows) {
      const sec = String(r.section || '').match(/^(\d{1,3})\s*(.*)$/);
      if (sec && !seen.has(sec[1])) { seen.add(sec[1]); rows.push({ no: sec[1], text: sec[2] }); }
      rows.push({ no: r.no, text: r.text, extra: r.extra });
    }
  }
  return chartFromRows(rows);
}
/** The page NOTE that points at machining after surface treatment ("... ADDITIONAL STAGE ... AFTER SURFACE TREATMENT (SEE RC 40.5)"). */
function extraStageNote(text) {
  const m = String(text || '').toUpperCase().match(/ADDITIONAL\s+STAGE[^\n]{0,80}?AFTER\s+SURFACE\s+TREATMENT[^\n]{0,20}?\(?\s*SEE\s+RC\s*(\d{1,3}(?:\.\d{1,2})?)/);
  return m ? { rc: m[1] } : null;
}
/** Chart -> QR route steps (same shape analyze.cjs uses). Heat treat is a machining-side step in QR's vocabulary. */
const QR_TYPE = { material: 'material', heat: 'machining', surface: 'surface', inserts: 'inserts', marking: 'marking', inspection: 'inspection', packing: 'packing', approval: 'general', general: 'general', machining: 'machining', other: 'other' };
function chartToRoute(chart) {
  return chart.ops.map((o) => ({ seq: o.no, type: QR_TYPE[o.kind] || 'other', title: o.name, items: o.items.length ? o.items.map((i) => ({ seq: i.no, text: i.text + (i.extra ? ' ' + i.extra : '') })) : [{ seq: o.no, text: o.name }], source: 'Routing chart', chartKind: o.kind }));
}module.exports = { opKind, procKind, extractSpecs, fixSpecDigits, thicknessOf, stockOf, chartFromRows, chartFromText, chartFromRequirements, extraStageNote, chartToRoute };

