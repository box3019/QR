'use strict';
// QR analysis: part identity, customer profile, material + allow-list, BOM / parts list, threads vs inserts,
// routing (route card), references, surface-zone markers, problems and engineer tasks.
const { findReferences } = require('./refs.cjs');

const { MATERIAL_RE, normalizeMaterialTokens, NOT_MATERIAL, isMaterialValue, DEFAULT_ALLOW, REJECT_FAMILIES, materialFamily, prettyMaterial, materialFromTitleBlock } = require('./materials.cjs');
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
    if (l.length <= 3 || /^[\d.\s±+\-()]+$/.test(l)) { if (++junk >= 2 && cur) break; continue; }
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
function detectCustomer(text) {
  const t = text.toUpperCase();
  if (/RAFAEL/.test(t) || /PRODUCTION ROUTING CHART/.test(t)) return 'RAFAEL';
  if (/ELBIT/.test(t)) return 'ELBIT';
  if (/\bKLA\b|KLA-TENCOR|KLA FORMAT/.test(t)) return 'KLA';
  if (/\b\d{4}[A-Z]\d{3}-\d{3}\b/.test(t)) return 'ELTA';
  return 'GENERIC';
}
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
function analyzePart({ drawing, partsList, models, settings, library }) {
  const pages = drawing.pages;
  const text = pages.map((p) => p.raw).join('\n');
  const customer = detectCustomer(text + ' ' + (partsList ? partsList.pages.map((p) => p.raw).join('\n') : ''));
  const id = detectPartNo(text, customer, drawing.name);
  const problems = [];
  const tasks = [];
  const addP = (severity, category, message, suggestion, evidence = [], extra = {}) => problems.push({ id: 'P' + (problems.length + 1), severity, category, message, suggestion, evidence, status: 'open', ...extra });

  // BOM
  let bom = [];
  let bomSource = '';
  if (partsList) { bom = parseEltaPartsListPages(partsList.pages); bomSource = 'Parts list ' + partsList.name; }
  else if (customer === 'RAFAEL') { bom = parseRafaelItemTable(text); bomSource = 'Drawing item table'; }

  // notes + routing
  const notes = parseNotes(text);
  let route = [];
  let routeSource = '';
  if (customer === 'RAFAEL') { route = parseRafaelRouting(text) || []; routeSource = 'PRODUCTION ROUTING CHART'; }
  if (!route.length) {
    routeSource = partsList ? 'Drawing NOTES + PARTS LIST' : 'Drawing NOTES';
    const order = ['material', 'machining', 'surface', 'marking', 'inserts', 'inspection', 'packing', 'general', 'other'];
    route = notes.map((n) => ({ seq: n.n, type: stepType(n.text), title: '', items: [{ seq: n.n, text: n.text }], source: 'Note ' + n.n }));
    route.sort((a, b) => 0);
  }

  // material: parts list -> routing 20 -> title block -> notes
  let material = null;
  const matLine = bom.find((b) => isMaterialValue(b.desc) && !/INSERT/.test(b.desc));
  if (matLine) material = { raw: matLine.desc, source: 'Parts list seq ' + matLine.seq, catalogNo: matLine.catalogNo, conf: 1 };
  if (!material && customer === 'RAFAEL') { const s = route.find((r) => r.seq === '20'); const it = s && s.items.find((i) => isMaterialValue(i.text)); if (it) material = { raw: it.text, source: 'Routing chart ' + it.seq, catalogNo: (it.text.match(/\b(\d{9})\b/) || [])[1], conf: 1 }; }
  let tbSeeNotes = false;
  if (!material) for (const p of pages) { const m = materialFromTitleBlock(p); if (m && m.raw) { material = m; break; } if (m && m.seeNotes) tbSeeNotes = true; }
  if (!material) { const n = notes.find((x) => /^MATERIAL\s*:/.test(x.text) && isMaterialValue(x.text)); if (n) material = { raw: n.text.replace(/^MATERIAL\s*:\s*/, ''), source: 'Note ' + n.n + (tbSeeNotes ? ' (title block: SEE NOTES)' : ''), conf: 1 }; }
  let status = 'pending', rejectReason = '';
  if (material) {
    const fam = materialFamily(material.raw, settings.materials || DEFAULT_ALLOW);
    Object.assign(material, { normalized: prettyMaterial(material.raw), family: fam.family });
    if (fam.allowed) status = 'accepted';
    else { status = 'rejected'; rejectReason = `Material: ${material.normalized} — not in "Materials we work with"`; }
  } else {
    addP('Question', 'Material', 'Material not found on the drawing (title block, notes, routing chart or parts list).', 'Ask the customer for the material specification.');
    rejectReason = 'Material not found';
  }

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
      if (/KEY-LOCKED|LIGHTWEIGHT/.test(v.insert) && ins.type === 'heavy-duty') diffs.push(`the view says "${v.insert.trim()}", the table says heavy-duty ${ins.locking}`);
      addP('Blocker', 'Threads vs inserts',
        `Tapped hole ${v.thread} on the view does not match insert ${b.catalogNo} in the table (${ins.type} ${ins.inner || ''}, outer thread ${ins.outer}).` + (diffs.length ? ` Also ${diffs.join('; ')}.` : ''),
        `Table likely correct → tap ${ins.outer} for insert ${b.catalogNo}. Confirm with the customer.`,
        [{ source: 'view', text: v.raw }, { source: bomSource, text: `${b.seq} ${b.desc} ${b.catalogNo} ${b.qty} ${b.uom}` }],
        { viewValue: v.thread, tableValue: ins.outer, likely: 'table' });
      if (v.qty && b.qty && v.qty !== b.qty) addP('Question', 'Threads vs inserts', `Insert quantity ${b.qty} in the table, ${v.qty} holes on the view.`, 'Confirm the quantity.');
    } else if (!insertCalls.length) {
      addP('Info', 'Threads vs inserts', `Insert ${b.catalogNo} (${want}) has no thread callout in the drawing text.`, 'Verify on the drawing views (OCR region / 3D model).', [], { verify: true });
    } else {
      addP('Question', 'Threads vs inserts', `No thread callout ${want} on the views for insert ${b.partNo || b.catalogNo} (${b.qty} ${b.uom}).`, 'Check the views or ask the customer.', [{ source: bomSource, text: b.desc.slice(0, 120) }]);
    }
  }
  // view insert callouts with no matching insert in the BOM (only when a BOM exists)
  if (inserts.length) for (const v of vt.filter((x) => x.insert)) {
    if (!inserts.some(({ ins }) => ins.required === v.thread || ins.inner === v.thread || ins.outer === v.thread) && !problems.some((p) => p.viewValue === v.thread))
      addP('Question', 'Threads vs inserts', `Thread ${v.thread} for an insert on the view has no matching insert in the parts list.`, 'Ask the customer which insert to use.', [{ source: 'view', text: v.raw }]);
  }
  for (const b of bom) {
    const prim = insertFromBom(b);
    if (!prim) continue;
    for (const a of b.alternatives) { const ai = insertFromBom(a); if (ai && ai.inner && prim.inner && ai.inner !== prim.inner) addP('Question', 'Parts list', `Alternative ${a.partNo} (cat. ${a.catalogNo}) under seq ${b.seq} is described as ${ai.inner}, but the primary insert ${b.partNo} is ${prim.inner}.`, `Ask the customer to confirm the alternative for seq ${b.seq}.`, [{ source: bomSource, text: a.desc.slice(0, 140) }]); }
  }
  const threadMatches = inserts.map(({ b, ins }) => ({ insert: `${b.partNo || ''} ${b.catalogNo}`.trim(), type: ins.type, required: ins.required, qty: b.qty, alternatives: b.alternatives.length, onView: vt.some((v) => v.thread === ins.required) }));

  // references -> tasks
  const allText = text + '\n' + (partsList ? partsList.pages.map((p) => p.raw).join('\n') : '');
  const refs = findReferences(allText, customer);
  const special = [];
  if (/SEE SEPARATE PART LIST/.test(text) && !partsList) special.push({ number: 'SEPARATE PART LIST', kind: 'internal', owner: customer, description: `Separate part list for ${id.partNo}`, raw: 'SEE SEPARATE PART LIST', context: 'SEE' });
  const nha = text.match(/SEE NEXT HIGHER ASSEMBLY\s+([\w-]+)/);
  if (nha) special.push({ number: nha[1], kind: 'internal', owner: customer, description: 'Next higher assembly (application data)', raw: nha[0], context: 'SEE' });
  for (const m of text.matchAll(/PLASCOTEC\s+INTERNAL\s+REFERENCE\s+PROCESS\s+ID\s*-?\s*(?:VERS\s+)?([A-Z0-9_]+)/g)) special.push({ number: m[1], kind: 'vendor', owner: 'Plascotec (coating vendor)', description: 'Coating vendor internal process — performed by the vendor (outsourced)', raw: m[0], context: 'PER' });
  for (const s of special) if (!refs.some((r) => r.number === s.number)) refs.push(s);
  const stepOfRef = (num) => route.find((s) => s.items.some((i) => i.text.includes(num)));
  for (const r of refs) {
    if (r.kind !== 'internal') continue;
    if (r.number === id.partNo) { r.kind = 'self'; continue; }
    const inLib = (library || []).find((d) => d.number === r.number);
    if (inLib) { r.docId = inLib.path; continue; }
    const st = stepOfRef(r.number);
    const blocks = st ? `step ${st.seq}${st.title ? ' ' + st.title : ''} (${st.type})` : 'route card';
    r.blocks = blocks;
    tasks.push({ id: 'T' + (tasks.length + 1), type: 'uploadDocument', refNumber: r.number, title: `Upload ${r.number} (${r.description || 'customer document'})`, blocks, status: 'open' });
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
        const finds = [...ft.matchAll(/(PRIMER|TOP COAT)\s*:\s*FIND NO\.?\s*(\d+)/g)].map((m) => `${m[1]} = find no. ${m[2]}`);
        addP('Question', 'Missing specification', `Note ${z.note} "PAINT ... USING:" gives no paint specification or colour${finds.length ? ' (only ' + finds.join(', ') + ' of the separate part list)' : ''}.`, 'Ask the customer for the paint spec and colour, or upload the separate part list.', [{ source: 'note ' + z.note, text: ft.trim().slice(0, 200) }]);
      }
      if (/ANOD/.test(z.text) && z.total === 0) {
        const conv = zones.find((o) => /CONVERSION/.test(o.text));
        addP('Question', 'Contradictory callouts', `Note ${z.note} (black anodize) is not assigned to any surface on the views${conv ? `, while note ${conv.note} (chemical conversion) is marked on ${conv.total} surfaces` : ''}. Which surfaces get anodize?`, 'Ask the customer which surfaces get anodize vs chemical conversion.', [{ source: 'note ' + z.note, text: z.text }]);
      }
    }
  }

  // nonsensical: tolerance band checks on simple "a - b" ranges
  for (const m of text.matchAll(/n?(\d+\.\d+)[ \t]*-[ \t]*n?[ \t]*(\d+\.\d+)/g)) if (+m[1] > +m[2] && +m[1] - +m[2] < 5) addP('Question', 'Nonsensical dimension', `Range ${m[0]}: min is larger than max.`, 'Ask the customer.');

  // missing datums (basic): datum letters referenced in tolerance frames vs datum feature symbols found
  const fcf = [...text.matchAll(/\b0\.\d+\s+([A-H])(?:\s+([A-H]))?(?:\s+([A-H]))?\b/g)].flatMap((m) => m.slice(1).filter(Boolean));
  const defined = new Set(pages.flatMap((p) => p.tokens.filter((t) => /^[A-H]$/.test(t.text.trim())).map((t) => t.text.trim())));
  for (const d of [...new Set(fcf)]) if (!defined.has(d)) addP('Question', 'Missing datum', `Datum ${d} is referenced in a tolerance frame but no datum feature ${d} was found.`, 'Ask the customer to define the datum.', [], { verify: true });

  // OCR-sourced low confidence values -> verify
  const ocrLow = pages.flatMap((p) => (p.ocr ? p.ocr.words.filter((w) => w.conf < 0.6 && /\d/.test(w.text)).map((w) => ({ page: p.n, text: w.text, conf: w.conf, bbox: bb(w) })) : []));
  for (const o of ocrLow.slice(0, 40)) tasks.push({ id: 'T' + (tasks.length + 1), type: 'verify', title: `Verify OCR value "${o.text}" (conf ${Math.round(o.conf * 100)}%) on page ${o.page}`, page: o.page, bbox: o.bbox, status: 'open' });

  // route card enrichment: material + inserts from parts list
  if (routeSource.includes('PARTS LIST') || (bom.length && customer !== 'RAFAEL')) {
    if (material && !route.some((s) => s.type === 'material')) route.unshift({ seq: 'M', type: 'material', title: 'MATERIAL', items: [{ seq: '', text: `${material.normalized} — ${material.raw}${material.catalogNo ? ' (cat. ' + material.catalogNo + ')' : ''}` }], source: material.source });
    for (const { b, ins } of inserts) route.push({ seq: 'I' + b.seq, type: 'inserts', title: 'INSERT', items: [{ seq: '', text: `${b.partNo} cat. ${b.catalogNo} — ${ins.type} ${ins.inner} × ${b.qty} ${b.uom}${b.alternatives.length ? ` (+${b.alternatives.length} Alt: ${b.alternatives.map((a) => a.partNo).join(', ')})` : ''}` }], source: bomSource });
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
  for (const s of route.filter((x) => x.empty && customer === 'RAFAEL' && ['10', '20', '30', '50', '70', '80', '90'].includes(x.seq))) addP('Info', 'Route card', `Routing chart step ${s.seq} ${s.title} has no sub-items.`, 'Check the routing chart.', [], { verify: true });

  const textMode = pages.some((p) => p.quality.mode === 'ocr') ? 'OCR' : pages.some((p) => p.quality.mode === 'mixed') ? 'Mixed' : 'Text';
  const openTasks = tasks.filter((t) => t.type === 'uploadDocument').length;
  const readiness = status === 'rejected' ? 'n/a' : openTasks ? `Blocked by ${openTasks} task${openTasks > 1 ? 's' : ''}` : problems.some((p) => p.severity === 'Blocker') ? 'Incomplete' : 'Ready';
  return { customer, ...id, material, status, rejectReason, bom, bomSource, notes, route, routeSource, refs, tasks, problems, threads: vt, threadMatches, zones, textMode, readiness };
}

module.exports = { detectPartNo, isMaterialCode, revFromFileName, parseEltaPartsListPages, analyzePart, DEFAULT_ALLOW, normalizeMaterialTokens, isMaterialValue, materialFamily, parseNotes, viewThreads, normThread, detectCustomer };
