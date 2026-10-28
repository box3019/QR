'use strict';
const { problem, text: msgText } = require('./i18n/messages.cjs');
// QR analysis: part identity, customer profile, material + allow-list, BOM / parts list, threads vs inserts,
// routing (route card), references, surface-zone markers, problems and engineer tasks.
const { findReferences } = require('./refs.cjs');
const { checkCapability } = require('./checks/capability.cjs');
const { routeFrom, materialFrom, problemsFrom } = require('./requirements/adapt.cjs');
const { defaultCatalog } = require('./catalog/index.cjs');
const { parseMaterial, oneLine } = require('./catalog/families.cjs');
const { chartToRoute } = require('./routing/chart.cjs');
const { findChart, materialFromChart, enrichRequirements, chartExtras } = require('./routing/apply.cjs');
const { detectProfile } = require('./customers/index.cjs');
const { STAGE, stageOfRef, buildRouteCard } = require('./docs/stage.cjs');
const { buildChecklist } = require('./checklist/detect.cjs');

const { normalizeMaterialTokens, isMaterialValue, materialFromTitleBlock } = require('./materials.cjs');
const bb = (t) => [Math.round(t.x), Math.round(t.y), Math.round(t.w), Math.round(t.h)];

// ---------- notes ----------
function parseNotes(raw) {
  const lines = raw.split('\n').map((s) => s.trim());
  const start = lines.findIndex((l) => /^NOTES\b/i.test(l));
  if (start < 0) return [];
  const notes = [];
  let cur = null, junk = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (cur && /^(SCALE\b|SECTION [A-Z]|DETAIL [A-Z]|VIEW [A-Z])/.test(l)) break;
    const m = l.match(/^(\d{1,2}(?:\.\d)?)\s*\.?\s+(\S.*)$/);
    if (m && +m[1] <= (notes.length ? +notes[notes.length - 1].n + 3 : 3) && !/^\d+(\.\d+)?$/.test(m[2])) {
      cur = { n: m[1], text: m[2] };
      notes.push(cur); junk = 0; continue;
    }
    if (l.length <= 3 || /^[\d.\sÂ±+\-()]+$/.test(l)) { if (++junk >= 2 && cur) break; continue; }
    if (cur && l.length > 3) { cur.text += ' ' + l; junk = 0; }
  }
  return notes.map((n) => ({ ...n, text: n.text.replace(/\s+/g, ' ').trim() }));
}

const STEP_TYPES = [
  ['material', /^MATERIAL\b|\bMATERIAL:/],
  ['inspection', /INSPECT|CMM|TEST|CERTIFICATION|REPORT/],
  ['packing', /PACKAG|PACKING|POLY BAG|BAGGING|BAG AND TAG|SHIPPING/],
  ['surface', /ANODI|ALODINE|CONVERSION|PAINT|COAT|PLATING|NICKEL|DLC|FINISH:|BLAST|PASSIVAT|MASK/],
  ['marking', /\bMARK|ENGRAV|SILK SCREEN|IDENTIF|LASER ETCH/],
  ['inserts', /INSERT/],
  ['machining', /BURR|SHARP EDGE|BREAK ALL|MACHIN|FILLET|RADII|STRESS RELIEF|HEAT/],
  ['general', /DIMENSION|MODEL|INTERPRET|DRAWING|RoHS|ROHS|CLEAN/i],
];
const stepType = (t) => {
  const u = t.toUpperCase();
  if (/^(ALL |THE )?(DIMENSIONS|MASTER|INTERPRET)/.test(u)) return 'general';
  // the earliest keyword in the note decides its type
  let best = ['other', 1e9];
  for (const [type, re] of STEP_TYPES) { const m = u.match(re); if (m && m.index < best[1]) best = [type, m.index]; }
  return best[0];
};

// ---------- RAFAEL production routing chart ----------
const RAF_GROUPS = { 10: 'general', 20: 'material', 30: 'machining', 40: 'marking', 50: 'surface', 60: 'inserts', 70: 'inspection', 80: 'approval', 90: 'packing' };
const RAF_NAMES = { 10: 'GENERAL INSTRUCTIONS', 20: 'MATERIAL', 30: 'MACHINING', 40: 'MARKING', 50: 'SURFACE TREATMENT', 60: 'INSERTS INSTALLATION', 70: 'INSPECTION', 80: 'FINAL APPROVAL', 90: 'PACKING' };
function parseRafaelRouting(raw) {
  const i = raw.indexOf('PRODUCTION ROUTING CHART');
  if (i < 0) return null;
  const lines = raw.slice(i).split('\n').map((s) => s.trim());
  const subs = [];
  let cur = null;
  for (const l of lines.slice(1)) {
    if (/^TOLERANCES\b|\bX THD\b|^DRILL\b/.test(l)) break;
    const m = l.match(/^(\d0\.\d{1,2})\s+(.*)$/);
    if (m) { cur = { seq: m[1], text: m[2] }; subs.push(cur); continue; }
    if (!cur) continue;
    if (/^([A-H]|\d+|[A-H] \d0|DESCRIPTION.*|No\. .*|DEFINITION)$/.test(l)) { if (l === 'DEFINITION' && cur && /PRODUCT$/.test(cur.text)) cur.text += ' DEFINITION'; continue; }
    if (Object.values(RAF_NAMES).includes(l)) continue;
    const l2 = l.replace(/^[A-H]\s+(?=[A-Z])/, '');
    cur.text += ' ' + l2;
  }
  for (const s of subs) s.text = s.text.replace(new RegExp('\\s+\\d0\\s+(' + Object.values(RAF_NAMES).join('|') + ')\\s*$'), '');
  const groups = {};
  for (const s of subs) { const g = Math.floor(parseFloat(s.seq) / 10) * 10; (groups[g] ||= []).push(s); }
  const steps = [];
  for (const g of Object.keys(RAF_NAMES).map(Number)) {
    const items = groups[g] || [];
    steps.push({ seq: String(g), type: RAF_GROUPS[g], title: RAF_NAMES[g], items: items.map((s) => ({ seq: s.seq, text: s.text.replace(/\s+/g, ' ').trim() })), source: 'Routing chart' });
  }
  return steps;
}

// ---------- BOM on drawing (RAFAEL ITEM table) ----------
function parseRafaelItemTable(raw) {
  const out = [];
  const re = /^\s*(\d{1,2})\s+(INSERT[^\n]*?|[A-Z][^\n]*?)\s+(\d{9})\s+(\d+)\s+(EA|PC|KG|M)\b/gm;
  let m;
  while ((m = re.exec(raw))) out.push({ seq: m[1], desc: m[2].trim(), catalogNo: m[3], qty: +m[4], uom: m[5], alternatives: [] });
  return out;
}

// ---------- ELTA parts list PDF ----------
function parseEltaPartsList(raw) {
  const lines = raw.split('\n').map((s) => s.trim());
  const rows = [];
  let cur = null;
  for (const l of lines) {
    const m = l.match(/^(\d{1,3}|Alt)\s+(.+?)\s+(\d{9})\s+(.*)$/);
    if (m) { cur = { seq: m[1], partNo: m[2], catalogNo: m[3], desc: m[4], qty: null, uom: '', makeBuy: '' }; rows.push(cur); continue; }
    if (!cur) continue;
    const q = l.match(/^(?:(.*?)\s+)?(\.?\d+(?:\.\d+)?)\s+(EA|M2|M|KG|PC)\s+(Buy|Make)\b/);
    if (q) { if (q[1]) cur.desc += ' ' + q[1]; cur.qty = parseFloat(q[2]); cur.uom = q[3]; cur.makeBuy = q[4]; cur = null; continue; }
    if (/^(\d{2}\/\d{2}\/\d{4}|Page |Seq|No$|Part Number|Dataset|Attached)/.test(l)) { cur = null; continue; }
    cur.desc += ' ' + l;
  }
  const bom = [];
  for (const r of rows) {
    r.desc = r.desc.replace(/\s+/g, ' ').replace(/- /g, '-').trim();
    if (r.seq === 'Alt' && bom.length) bom[bom.length - 1].alternatives.push(r);
    else bom.push({ ...r, alternatives: [] });
  }
  return bom;
}

// geometric parts-list parser (columns from the header row, rows from the Seq column)
function parseEltaPartsListPages(pages) {
  const rows = [];
  for (const p of pages) {
    const qty = p.tokens.find((t) => t.text.trim() === 'Qty');
    if (!qty) continue;
    const hdr = p.tokens.filter((t) => Math.abs(t.y - qty.y) < 3);
    const col = (name) => (hdr.find((t) => t.text.trim().startsWith(name)) || {}).x;
    const X = { seq: col('Seq') ?? 0, pn: col('Part Number'), cat: col('Catalog'), desc: col('Description'), qty: qty.x, uom: col('Uom'), type: col('Item Type'), msl: col('MSL') ?? 9999 };
    const body = p.tokens.filter((t) => t.y > qty.y + 4 && !/^(\d{2}\/\d{2}\/\d{4}|Page |UNCLASSIFIED)/.test(t.text.trim()));
    const stop = p.tokens.filter((t) => /^(Dataset Information|\d{2}\/\d{2}\/\d{4})/.test(t.text.trim()) && t.y > qty.y).sort((a, b) => a.y - b.y)[0];
    const seqs = body.filter((t) => t.x < X.pn - 5 && /^(\d{1,3}|Alt)$/.test(t.text.trim()) && (!stop || t.y < stop.y)).sort((a, b) => a.y - b.y);
    seqs.forEach((sq, i) => {
      const y1 = i + 1 < seqs.length ? seqs[i + 1].y - 1 : (stop ? stop.y - 1 : 1e9);
      const inRow = body.filter((t) => t.y >= sq.y - 2 && t.y < y1).sort((a, b) => a.y - b.y || a.x - b.x);
      const get = (x0, x1) => inRow.filter((t) => t.x >= x0 - 3 && t.x < x1 - 3).map((t) => t.text.trim()).join(' ').replace(/- /g, '-').trim();
      rows.push({ seq: sq.text.trim(), partNo: get(X.pn, X.cat).replace(/\s+\d$/, ''), catalogNo: get(X.cat, X.desc), desc: get(X.desc, X.qty).replace(/\s+\.\d+$/, ''), qty: parseFloat(get(X.qty, X.uom).replace(/^\./, '0.')) || parseFloat((get(X.desc, X.qty).match(/\s(\.\d+)$/) || [])[1]) || null, uom: get(X.uom, X.type), makeBuy: get(X.type, X.msl) });
    });
  }
  const bom = [];
  for (const r of rows) {
    if (r.seq === 'Alt' && bom.length) bom[bom.length - 1].alternatives.push(r);
    else bom.push({ ...r, alternatives: [] });
  }
  return bom;
}

// ---------- threads ----------
const UN_DEC = { '.060': 0, '.073': 1, '.086': 2, '.099': 3, '.112': 4, '.125': 5, '.138': 6, '.164': 8, '.190': 10, '.216': 12, '.250': '1/4' };
function normThread(s) {
  s = s.toUpperCase().replace(/\s+/g, '');
  let m = s.match(/M(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)/);
  if (m) return `M${+m[1]}X${+m[2]}`;
  m = s.match(/^#?(\.\d{3}|\d{1,2})-(\d{2,3})-?UN/);
  if (m) { const sz = m[1].startsWith('.') ? UN_DEC[m[1]] : +m[1]; return sz === undefined ? null : `#${sz}-${m[2]}`; }
  return null;
}
function viewThreads(raw) {
  const out = [];
  const lines = raw.split('\n');
  const re = /(?:THD\s+)?(M\d+(?:\.\d+)?\s*X\s*\d+(?:\.\d+)?(?:-\d[GH])?|#?(?:\.\d{3}|\d{1,2})\s*-\s*\d{2,3}\s*-?\s*UN[CFJ]?[CF]?\s*-?\s*\d?[AB]?)/g;
  lines.forEach((l, i) => {
    if (/INSERT HEAVY|OUTER THREAD|INSERT,HELICAL|^\s*\d+\s+INSERT/.test(l)) return;
    let m; re.lastIndex = 0;
    while ((m = re.exec(l))) {
      const n = normThread(m[1].replace(/\s+/g, ''));
      if (!n) continue;
      const near = lines.slice(Math.max(0, i - 8), i + 3).join(' ').slice(-420);
      const qty = (near.match(/(\d+)\s*X\s+(?:THD|\d)/) || near.match(/\b(\d+)X\s/) || [])[1];
      out.push({ thread: n, raw: l.trim(), line: i, insert: /INSERT/.test(near) ? (near.match(/(HELICAL COIL|KEY-LOCKED|LIGHTWEIGHT|HEAVY DUTY)[^\n]*?INSERT|INSERT/) || [''])[0] : '', qty: qty ? +qty : null });
    }
  });
  return out;
}
function insertFromBom(line) {
  const d = line.desc.toUpperCase();
  if (!/INSERT/.test(d)) return null;
  const outer = d.match(/OUTER THREAD\s+(M\d+(?:\.\d+)?X\d+(?:\.\d+)?)/);
  const inner = d.match(/\b(M\d+(?:\.\d+)?X\d+(?:\.\d+)?)/) || d.match(/#(\d{1,2})-(\d{2,3})/);
  const type = /HEAVY DUTY/.test(d) ? 'heavy-duty' : /KEY-?LOCK/.test(d) ? 'key-locked' : /HELICAL/.test(d) ? 'helical coil' : 'insert';
  const innerT = inner ? (inner[0].startsWith('#') ? `#${inner[1]}-${inner[2]}` : normThread(inner[1])) : null;
  // helical coil: the drawing callout gives the nominal (insert) thread, so compare with the inner thread;
  // solid / heavy-duty inserts with an outer thread need a tapped hole of that outer thread.
  return { type, inner: innerT, required: outer ? normThread(outer[1]) : innerT, outer: outer ? normThread(outer[1]) : null, locking: /NON[- ]?LOCKING/.test(d) ? 'non-locking' : /LOCKING/.test(d) ? 'locking' : '' };
}

// ---------- customer profile ----------
const detectCustomer = (text) => detectProfile({ text }).base; // compat: base profile from the built-in data
/** UNS / alloy codes (C36000, A92024...) are materials, not part numbers. */
function isMaterialCode(pn, text) { return /^[ACS]\d{5}$/.test(pn) && new RegExp('(ALLOY|BRASS|COPPER|BRONZE|STEEL|ALUMIN\\w*)[^\\n]{0,40}' + pn + '|' + pn + '-H\\d', 'i').test(text); }
/** RAFAEL file names: <PN>-<REV>-PD-<PN>_<REV>[-pas].pdf */
function revFromFileName(fileName, pn) { const f = String(fileName).toUpperCase(); return (f.match(new RegExp((pn || '[A-Z0-9]+') + '-([A-Z]{1,2})-PD-')) || f.match(/_([A-Z]{1,2})(?:-PAS)?(?:\s*\(?\d{1,2}\)?)?(?:\.PDF)+$/) || [])[1] || null; }
function detectPartNo(text, customer, fileName) {
  const t = text;
  const pats = { RAFAEL: /\b([A-Z]{1,2}\d{5}[A-Z]?)\b/, ELTA: /\b(\d{4}[A-Z]\d{3}-\d{3})\b/, KLA: /\b(0\d{6}-\d{3})\b/, ELBIT: /\b(\d{4}-\d{4}-\d{2})\b/ };
  const re = pats[customer];
  let pn = null;
  if (re) {
    const counts = {};
    for (const m of t.matchAll(new RegExp(re.source, 'g'))) counts[m[1]] = (counts[m[1]] || 0) + 1;
    pn = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }
  // the file name wins when it names a part number that also appears in the drawing text (never a material/UNS code like C36000)
  const fnTok = (String(fileName).toUpperCase().match(/^([A-Z]{1,6}\d{4,}[A-Z]?|\d{4}[A-Z]\d{3}-\d{3}|0\d{6}-\d{3}|\d{4}-\d{4}-\d{2})/) || [])[1];
  if (fnTok && t.toUpperCase().includes(fnTok)) pn = fnTok;
  else if (pn && isMaterialCode(pn, t)) pn = fnTok || null;
  if (!pn) pn = (fileName.match(/([A-Z0-9]{4,}[-_]?[A-Z0-9-]*)/i) || [])[1] || fileName;
  let rev = null;
  const rr = t.match(/\bREV(?:ISION)?\s*[:.]?\s*([A-Z]{1,2}|-)\b(?!\w)/);
  if (customer === 'RAFAEL') rev = revFromFileName(fileName, pn) || (t.match(new RegExp(pn + '\\s+A[0-4]\\s+([A-Z])\\b')) || [])[1] || (t.match(/SIZE REV\s*\n?.*?\b([A-Z])\s*$/m) || [])[1] || null;
  if (customer === 'ELTA') rev = (t.match(new RegExp(pn + '\\s+REV:([A-Z-]+)')) || [])[1] || null;
  if (customer === 'KLA') { const revs = [...t.matchAll(/^\s*(A[A-H])\s*$/gm), ...t.matchAll(/^\s*(A[A-H])\s+[A-Z]{3,}/gm)].map((m) => m[1]).sort(); rev = revs[revs.length - 1] || null; }
  if (customer === 'ELBIT') rev = (t.match(/Drawing:\s*[\d-]+,\s*([A-Z])/) || [])[1] || null;
  if (!rev && rr) rev = rr[1];
  // generic: rev letter glued to the part number in the file name (1234a567-001b.pdf, 0123456-001_AC.pdf)
  if (!rev && pn) rev = (String(fileName).toUpperCase().match(new RegExp('^' + pn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[-_ ]?(?:REV[-_ ]?)?([A-Z]{1,2})(?=[-_ .(]|$)')) || [])[1] || null;
  const title = (customer === 'RAFAEL' && (t.match(/TITLE\s*\n?.*?CHECKED\s+([A-Za-z][A-Za-z ]+?)\s+\d\s*$/m) || [])[1]) ||
    (customer === 'KLA' && (t.match(/\n((?:BRKT|CHUCK|LBC)[^\n]+)/) || [])[1]) || '';
  return { partNo: pn, rev, title: title.trim() };
}

// ---------- surface-zone markers (ELBIT style: note numbers like 3.1 / 3.4 placed on the views) ----------
function zoneMarkers(pages, noteIds) {
  const res = {};
  for (const p of pages) {
    for (const t of p.tokens) {
      const s = t.text.trim();
      if (!noteIds.includes(s)) continue;
      // a note heading has text right after it on the same line; a view marker stands alone
      const hasText = p.tokens.some((o) => o !== t && Math.abs(o.y - t.y) < t.h * 0.6 && o.x > t.x + t.w - 1 && o.x < t.x + t.w + 25 && /[A-Z]{2,}/.test(o.text));
      if (hasText || /^\d+\.\d\s+\S/.test(t.text)) continue;
      (res[s] ||= {})[p.n] = ((res[s] || {})[p.n] || 0) + 1;
    }
  }
  return res;
}

// ---------- main analysis ----------
function analyzePart({ drawing, partsList, models, settings, library, requirements: requirements0 = [] }) {
  const pages = drawing.pages;
  const text = pages.map((p) => p.raw).join('\n');
  // routing chart (own module): material, treatments, specs, route. The friend's rows stay untouched; the chart only adds to them.
  const requirements = requirements0;
  const chartInfo = findChart({ pages, requirements: requirements0, text });
  const profile = detectProfile({ text: text + ' ' + (partsList ? partsList.pages.map((p) => p.raw).join('\n') : ''), fileName: drawing.name, emails: drawing.emails || [] }, settings.customers);
  const customer = profile.base; // base profile picks the parsers below
  const id = detectPartNo(text, customer, drawing.name);
  if (!id.rev && drawing.path) id.rev = (String(drawing.path).split(/[\\/]/).slice(-2, -1)[0] || '').toUpperCase().match(/^REV(?:ISION)?[-_ ]?([A-Z]{1,2})$/)?.[1] || null; // ...\\Revision_B\\1.pdf
  const problems = [];
  const tasks = [];
  const addK = (severity, category, key, vars, evidence = [], extra = {}) => problems.push({ id: 'P' + (problems.length + 1), ...problem(severity, category, key, vars), evidence, status: 'open', ...extra });

  // BOM
  let bom = [];
  let bomSource = '';
  if (partsList) { bom = parseEltaPartsListPages(partsList.pages); bomSource = 'Parts list ' + partsList.name; }
  else if (customer === 'RAFAEL') { bom = parseRafaelItemTable(text); bomSource = 'Drawing item table'; }

  // notes + routing
  const notes = parseNotes(text);
  let route = [];
  let routeSource = '';
  if (customer === 'RAFAEL' && !/^notes/.test(profile.routing)) { route = parseRafaelRouting(text) || []; routeSource = 'PRODUCTION ROUTING CHART'; }
  if (!route.length) {
    routeSource = partsList ? 'Drawing NOTES + PARTS LIST' : 'Drawing NOTES';
    const order = ['material', 'machining', 'surface', 'marking', 'inserts', 'inspection', 'packing', 'general', 'other'];
    route = notes.map((n) => ({ seq: n.n, type: stepType(n.text), title: '', items: [{ seq: n.n, text: n.text }], source: 'Note ' + n.n }));
    route.sort((a, b) => 0);
  }
  // friend's extraction (core/requirements) is the source of truth for steps and material when it found the requirements
  const fRoute = requirements.some((p) => p.rows.length) ? routeFrom(requirements, stepType) : [];
  if (fRoute.length) { route = fRoute; routeSource = fRoute[0].source === 'Routing chart' ? 'PRODUCTION ROUTING CHART' : partsList ? 'Drawing NOTES + PARTS LIST' : 'Drawing NOTES'; }
  // the chart replaces a route only when none was read from a routing chart already (text layer / port): its OCR is a fallback, not a better reader
  if (chartInfo && chartInfo.source !== 'requirements' && !(routeSource === 'PRODUCTION ROUTING CHART' && route.length)) { route = chartToRoute(chartInfo.chart); routeSource = 'PRODUCTION ROUTING CHART'; }

  // material: parts list -> routing 20 -> title block -> notes
  let material = materialFrom(requirements);
  const chartMat = chartInfo && materialFromChart(chartInfo.chart);
  if (chartMat && (parseMaterial(chartMat.raw) || isMaterialValue(chartMat.raw)) && !material) material = { ...chartMat, friend: material && material.friend };
  const matLine = bom.find((b) => isMaterialValue(b.desc) && !/INSERT/.test(b.desc));
  if (matLine && !material) material = { raw: matLine.desc, source: 'Parts list seq ' + matLine.seq, catalogNo: matLine.catalogNo, conf: 1 };
  if (!material && customer === 'RAFAEL') { const s = route.find((r) => r.seq === '20'); const it = s && s.items.find((i) => isMaterialValue(i.text)); if (it) material = { raw: it.text, source: 'Routing chart ' + it.seq, catalogNo: (it.text.match(/\b(\d{9})\b/) || [])[1], conf: 1 }; }
  let tbSeeNotes = false;
  if (!material) for (const p of pages) { const m = materialFromTitleBlock(p); if (m && m.raw) { material = m; break; } if (m && m.seeNotes) tbSeeNotes = true; }
  if (!material) { const n = notes.find((x) => /^MATERIAL\s*:/.test(x.text) && isMaterialValue(x.text)); if (n) material = { raw: n.text.replace(/^MATERIAL\s*:\s*/, ''), source: 'Note ' + n.n + (tbSeeNotes ? ' (title block: SEE NOTES)' : ''), conf: 1 }; }
  // capability: material + processes vs the enabled catalog (core/checks/capability.cjs)
  const capLines = [...notes.map((n) => ({ text: n.text, where: 'note ' + n.n })), ...route.flatMap((r) => r.items.map((i) => ({ text: i.text, where: (routeSource.startsWith('PRODUCTION') ? 'routing ' : 'step ') + (i.seq || r.seq) }))), ...bom.map((b) => ({ text: b.desc, where: 'parts list seq ' + b.seq }))];
  const cap = checkCapability({ material, lines: capLines, catalog: settings.catalog || defaultCatalog() });
  let { status, rejectReason, rejectKey } = cap;
  if (material) {
    const parsed = cap.materialMatch.parsed || parseMaterial(material.raw);
    Object.assign(material, { normalized: cap.materialMatch.found, family: cap.materialMatch.entry ? cap.materialMatch.entry.family : 'Not in list', catalogId: cap.materialMatch.entry && cap.materialMatch.entry.id, parsed: parsed || null, stock: material.stock || (parsed && parsed.stock) || null });
    material.line = parsed ? oneLine({ ...parsed, stock: material.stock || parsed.stock }) : material.normalized;
  }
  else addK('Question', 'Material', 'mat.none', {});
  for (const p of cap.problems) problems.push({ id: 'P' + (problems.length + 1), ...p, evidence: [], status: 'open' });
  const chartX = chartExtras(chartInfo, text);
  if (chartX && chartX.machiningAfter) addK('Info', 'Routing chart', 'chart.after', { rc: chartX.machiningAfter.rc, sheet: chartX.machiningAfter.sheet }, [{ source: 'routing ' + chartX.machiningAfter.no, text: String(chartX.machiningAfter.text || '').slice(0, 120) }]);
  // threads vs inserts
  const vt = viewThreads(text);
  const inserts = bom.map((b) => ({ b, ins: insertFromBom(b) })).filter((x) => x.ins);
  for (const { b, ins } of inserts) {
    const calls = vt.filter((v) => v.insert);
    const want = ins.required;
    const hit = calls.find((v) => v.thread === want) || vt.find((v) => v.thread === want); // callout present, insert note may be elsewhere
    if (hit) continue;
    const insertCalls = calls.length ? calls : vt;
    if (ins.outer && insertCalls.length) {
      const v = insertCalls[0];
      const diffs = [];
      const kl = /KEY-LOCKED|LIGHTWEIGHT/.test(v.insert) && ins.type === 'heavy-duty';
      addK('Blocker', 'Threads vs inserts', 'thr.mismatch', { view: v.thread, cat: b.catalogNo, type: ins.type, inner: ins.inner, outer: ins.outer, viewInsert: kl ? v.insert.trim() : '', locking: ins.locking },
        [{ source: 'view', text: v.raw }, { source: bomSource, text: `${b.seq} ${b.desc} ${b.catalogNo} ${b.qty} ${b.uom}` }],
        { viewValue: v.thread, tableValue: ins.outer, likely: 'table' });
      if (v.qty && b.qty && v.qty !== b.qty) addK('Question', 'Threads vs inserts', 'thr.qty', { table: b.qty, view: v.qty });
    } else if (!insertCalls.length) {
      addK('Info', 'Threads vs inserts', 'thr.noText', { cat: b.catalogNo, want }, [], { verify: true });
    } else {
      addK('Question', 'Threads vs inserts', 'thr.noCallout', { want, pn: b.partNo || b.catalogNo, qty: b.qty, uom: b.uom }, [{ source: bomSource, text: b.desc.slice(0, 120) }]);
    }
  }
  // view insert callouts with no matching insert in the BOM (only when a BOM exists)
  if (inserts.length) for (const v of vt.filter((x) => x.insert)) {
    if (!inserts.some(({ ins }) => ins.required === v.thread || ins.inner === v.thread || ins.outer === v.thread) && !problems.some((p) => p.viewValue === v.thread))
      addK('Question', 'Threads vs inserts', 'thr.noBom', { thread: v.thread }, [{ source: 'view', text: v.raw }]);
  }
  for (const b of bom) {
    const prim = insertFromBom(b);
    if (!prim) continue;
    for (const a of b.alternatives) { const ai = insertFromBom(a); if (ai && ai.inner && prim.inner && ai.inner !== prim.inner) addK('Question', 'Parts list', 'bom.alt', { alt: a.partNo, cat: a.catalogNo, seq: b.seq, altInner: ai.inner, pn: b.partNo, inner: prim.inner }, [{ source: bomSource, text: a.desc.slice(0, 140) }]); }
  }
  const threadMatches = inserts.map(({ b, ins }) => ({ insert: `${b.partNo || ''} ${b.catalogNo}`.trim(), type: ins.type, required: ins.required, qty: b.qty, alternatives: b.alternatives.length, onView: vt.some((v) => v.thread === ins.required) }));

  // references -> tasks
  const allText = text + '\n' + (partsList ? partsList.pages.map((p) => p.raw).join('\n') : '');
  const refs = findReferences(allText, customer);
  const special = [];
  if (/SEE SEPARATE PART LIST/.test(text) && !partsList) special.push({ number: 'SEPARATE PART LIST', kind: 'internal', owner: customer, description: `Separate part list for ${id.partNo}`, raw: 'SEE SEPARATE PART LIST', context: 'SEE' });
  const nha = text.match(/SEE NEXT HIGHER ASSEMBLY\s+([\w-]+)/);
  if (nha) special.push({ number: nha[1], kind: 'internal', owner: customer, description: 'Next higher assembly (application data)', raw: nha[0], context: 'SEE' });
  for (const m of text.matchAll(/PLASCOTEC\s+INTERNAL\s+REFERENCE\s+PROCESS\s+ID\s*-?\s*(?:VERS\s+)?([A-Z0-9_]+)/g)) special.push({ number: m[1], kind: 'vendor', owner: 'Plascotec (coating vendor)', description: 'Coating vendor internal process â€” performed by the vendor (outsourced)', raw: m[0], context: 'PER' });
  for (const s of special) if (!refs.some((r) => r.number === s.number)) refs.push(s);
  const stepOfRef = (num) => route.find((s) => s.items.some((i) => i.text.includes(num)));
  for (const r of refs) {
    if (r.kind !== 'internal') continue;
    if (r.number === id.partNo) { r.kind = 'self'; continue; }
    const inLib = (library || []).find((d) => d.number === r.number);
    if (inLib) { r.docId = inLib.path; continue; }
    if (stageOfRef(r) === STAGE.ROUTE) { r.stage = STAGE.ROUTE; continue; } // customer spec: for the route card, not a quote-stage document
    const st = stepOfRef(r.number);
    const bv = st ? { seq: st.seq, title: st.title, type: st.type } : {};
    const blocks = msgText('task.blocks', bv, 'en');
    r.blocks = blocks; r.blocksVars = bv;
    const tv = { num: r.number, desc: r.description };
    tasks.push({ id: 'T' + (tasks.length + 1), type: 'uploadDocument', refNumber: r.number, title: msgText('task.upload', tv, 'en'), key: 'task.upload', vars: tv, stage: STAGE.NOW, blocks, blocksVars: bv, status: 'open' });
    if (st) st.blocked = true;
  }

  // ELBIT-style surface zones: note numbers (3.1, 3.4 ...) placed on views
  const subNotes = notes.filter((n) => /^\d\.\d$/.test(n.n)).map((n) => ({ id: n.n, text: n.text }));
  let zones = null;
  if (subNotes.length) {
    const ids = [...new Set(subNotes.map((s) => s.id))];
    const counts = zoneMarkers(pages, ids);
    zones = ids.map((z) => ({ note: z, text: subNotes.find((s) => s.id === z).text, perSheet: counts[z] || {}, total: Object.values(counts[z] || {}).reduce((a, b) => a + b, 0) }));
    const full = (z) => (subNotes.find((s) => s.id === z) || {}).text || '';
    for (const z of zones) {
      const ft = full(z.note).replace(/\s+/g, ' ');
      if (/USING:/.test(ft)) {
        const finds = [...ft.matchAll(/(PRIMER|TOP COAT)\s*:\s*FIND NO\.?\s*(\d+)/g)].map((m) => [m[1], m[2]]);
        addK('Question', 'Missing specification', 'spec.paint', { note: z.note, finds }, [{ source: 'note ' + z.note, text: ft.trim().slice(0, 200) }]);
      }
      if (/ANOD/.test(z.text) && z.total === 0) {
        const conv = zones.find((o) => /CONVERSION/.test(o.text));
        addK('Question', 'Contradictory callouts', 'spec.anodize', { note: z.note, conv: conv ? conv.note : '', total: conv ? conv.total : 0 }, [{ source: 'note ' + z.note, text: z.text }]);
      }
    }
  }

  // nonsensical: tolerance band checks on simple "a - b" ranges
  for (const m of text.matchAll(/n?(\d+\.\d+)[ \t]*-[ \t]*n?[ \t]*(\d+\.\d+)/g)) if (+m[1] > +m[2] && +m[1] - +m[2] < 5) addK('Question', 'Nonsensical dimension', 'dim.range', { range: m[0] });

  // missing datums (basic): datum letters referenced in tolerance frames vs datum feature symbols found
  const fcf = [...text.matchAll(/\b0\.\d+\s+([A-H])(?:\s+([A-H]))?(?:\s+([A-H]))?\b/g)].flatMap((m) => m.slice(1).filter(Boolean));
  const defined = new Set(pages.flatMap((p) => p.tokens.filter((t) => /^[A-H]$/.test(t.text.trim())).map((t) => t.text.trim())));
  for (const d of [...new Set(fcf)]) if (!defined.has(d)) addK('Question', 'Missing datum', 'datum.missing', { d }, [], { verify: true });

  // OCR-sourced low confidence values -> verify
  const ocrLow = pages.flatMap((p) => (p.ocr ? p.ocr.words.filter((w) => w.conf < 0.6 && /\d/.test(w.text)).map((w) => ({ page: p.n, text: w.text, conf: w.conf, bbox: bb(w) })) : []));
  for (const o of ocrLow.slice(0, 40)) tasks.push({ id: 'T' + (tasks.length + 1), type: 'verify', ...((tv) => ({ title: msgText('task.verify', tv, 'en'), key: 'task.verify', vars: tv }))({ text: o.text, conf: Math.round(o.conf * 100), page: o.page }), page: o.page, bbox: o.bbox, status: 'open' });

  // route card enrichment: material + inserts from parts list
  if (routeSource.includes('PARTS LIST') || (bom.length && customer !== 'RAFAEL')) {
    if (material && !route.some((s) => s.type === 'material')) route.unshift({ seq: 'M', type: 'material', title: 'MATERIAL', items: [((v) => ({ seq: '', text: msgText('route.material', v, 'en'), key: 'route.material', vars: v }))({ norm: material.normalized, raw: material.raw, cat: material.catalogNo || '' })], source: material.source });
    for (const { b, ins } of inserts) route.push({ seq: 'I' + b.seq, type: 'inserts', title: 'INSERT', items: [((v) => ({ seq: '', text: msgText('route.insert', v, 'en'), key: 'route.insert', vars: v }))({ pn: b.partNo, cat: b.catalogNo, type: ins.type, inner: ins.inner, qty: b.qty, uom: b.uom, alts: b.alternatives.map((a) => a.partNo) })], source: bomSource });
  }
  for (const s of route) {
    const t = s.items.map((i) => i.text).join(' ');
    s.specRefs = refs.filter((r) => t.includes(r.number)).map((r) => r.number);
    s.outsourced = s.type === 'surface' && !/^\s*(\d+(\.\d)?\s+)?DO NOT/.test(t) && /ANODI|ALODINE|CONVERSION|PAINT|NICKEL|DLC|PLATING|COAT/.test(t) && !/^MASK/.test(t);
    if (s.type === 'surface' && /MASK/.test(t)) s.note = 'Masking before coating';
    if (!t.trim()) { s.empty = true; }
  }
  // masking must come before coating in the card
  const maskIdx = route.findIndex((s) => s.type === 'surface' && /MASK/.test(s.items.map((i) => i.text).join(' ')) && s.items.length === 1 && !/ANODI|PAINT|CONVERSION/.test(s.items[0].text));
  const coatIdx = route.findIndex((s) => s.outsourced);
  if (maskIdx > coatIdx && coatIdx >= 0) { const [m] = route.splice(maskIdx, 1); route.splice(coatIdx, 0, m); m.moved = 'moved before coating'; }

  const textMode = pages.some((p) => p.quality.mode === 'ocr') ? 'OCR' : pages.some((p) => p.quality.mode === 'mixed') ? 'Mixed' : 'Text';
  const openTasks = tasks.filter((t) => t.type === 'uploadDocument').length;
  const readiness = status === 'rejected' ? 'n/a' : status === 'pending' ? 'Blocked: no material' : openTasks ? `Blocked by ${openTasks} task${openTasks > 1 ? 's' : ''}` : problems.some((p) => p.severity === 'Blocker') ? 'Incomplete' : 'Ready';
  for (const x of problemsFrom(requirements)) problems.push({ id: 'P' + (problems.length + 1), ...x });
  const routeCard = { ...buildRouteCard({ route, refs, notes }), v: 1 };
  let checklist = null; try { checklist = buildChecklist({ notes, route, bom, material, status }, pages); } catch (e) { checklist = null; }
  return { routeCard, checklist, requirements: enrichRequirements(requirements0, chartInfo), chart: chartX, customer: profile.name, customerId: profile.id, profile: customer, profileWhy: profile.why, questionsLanguage: profile.questionsLanguage, ...id, material, status, rejectReason, rejectKey, bom, bomSource, notes, route, routeSource, refs, tasks, problems, threads: vt, threadMatches, zones, textMode, readiness };
}

module.exports = { detectPartNo, isMaterialCode, revFromFileName, parseEltaPartsListPages, analyzePart, normalizeMaterialTokens, isMaterialValue, parseNotes, viewThreads, normThread, detectCustomer };
