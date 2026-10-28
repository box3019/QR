'use strict';
const { zoneGrid, zoneOf } = require('./zones.cjs');
// Checklist detector (Alex's paper list): rules-driven, deterministic, no guessing.
// Each row is yes (found, with WHAT and WHERE), no (explicitly excluded, or the drawing was read well and it is not called out) or notfound (drawing could not be read well enough to say).
// Thresholds (tight tolerances, fits) are NOT applied here: this module stores every candidate and core/checklist/live.mjs applies the Settings thresholds live.
const NEG = /\b(DO NOT|DON'T|NO|NOT|WITHOUT|EXCEPT|UNPAINTED|NON)\s+(?:\w+\s+){0,2}$/;
const COLORS = ['RED', 'BLACK', 'WHITE', 'YELLOW', 'BLUE', 'GREEN', 'GRAY', 'GREY', 'ORANGE', 'SILVER', 'GOLD'];
const COLOR_RE = new RegExp('\\b(' + COLORS.join('|') + ')\\b');
const SPEC_RE = /\b(MIL-[A-Z]{1,4}-\d{3,6}[A-Z]?|AMS[\s-]?\d{4}[A-Z]?(?:\/\d+)?|QQ-[A-Z]-\d+|ASTM\s?[AB][\s-]?\d{2,4}|ISO\s?\d{3,6}|DIN\s?\d{2,5}|SAE[\s-]?AMS\s?\d{4}|FED-STD-\d+|RAL\s?\d{4})\b/g;
const TYPE_RE = /\b(TYPE\s+(?:[IV]{1,3}[A-Z]?|\d[A-Z]?)|CLASS\s+\d[A-Z]?|GRADE\s+\w+)\b/g;
const SIZE_RE = /(M\d+(?:\.\d+)?\s*[Xx]\s*\d+(?:\.\d+)?|#\d{1,2}[\s-]\d{2}(?:\s*UN[CFJ]+[\s-]?\d[AB])?|\d{1,2}\/\d{1,2}[\s-]\d{2}(?:\s*UN[CFJ]+[\s-]?\d[AB])?|\.\d{3,4}[\s-]\d{2}\s*UN[CFJ]+(?:[\s-]?\d[AB])?|\bM\d+(?:\.\d+)?\b|(?:[\u00D8O]\s?)?\d+(?:\.\d+)?\s*[Xx]\s*\d+(?:\.\d+)?(?:\s?MM)?|[\u00D8]\s?\d+(?:\.\d+)?)/g;
const uniq = (a) => [...new Set(a.map((x) => String(x).replace(/\s+/g, ' ').trim()))].filter(Boolean);
const all = (re, s) => uniq([...String(s).matchAll(re)].map((m) => m[0]));

// ---- rules table: [row, key, regex, spec(text, match) -> {spec?, color?}] ----
const RULES = [
  { row: 'heat', key: 'heat', re: /HEAT[\s-]?TREAT(?:ED|MENT|ING)?|SOLUTION\s+(?:HEAT\s+)?TREAT|AGE[\s-]?HARDEN|\bANNEAL(?:ED|ING)?\b|STRESS[\s-]?RELIEV?(?:E|ED|ING)|\bQUENCH(?:ED|ING)?\b|\bCRYO(?:GENIC)?\b|AMS[\s-]?2(?:770|759|774|750)|MIL-H-(?:6088|81200)|\bHARDNESS\b[^.;]{0,25}|\bHRC\s*\d{2}(?:\s*[-–]\s*\d{2})?|\bTEMPERED\b/, spec: (t, m) => ({ spec: uniq([...(t.match(/\bAMS[\s-]?2\d{3}\b|MIL-H-\d+/g) || []), ...(t.match(/\bHRC\s*\d{2}(?:\s*[-–]\s*\d{2})?/g) || [])]).join(', ') }) },
  { row: 'laser', key: 'laser', re: /LASER[\s-]*(?:MARK|ETCH|ENGRAV|ANNEAL|ABLAT)\w*|\bLASER\b[^.;]{0,25}\bMARK|\bMARK\w*[^.;]{0,25}\bLASER\b/ },
  { row: 'engrave', key: 'engrave', re: /\bENGRAV(?:E|ED|ING|INGS)\b/, skip: (t) => /\bLASER\b/.test(t) },
  { row: 'coating', key: 'anodize', re: /\bANODI[SZ](?:E|ED|ING|E\s+COAT)\b|\bANODIC\b|MIL-A-8625|MIL-PRF-8625|\bHARDCOAT\b|\bAMS[\s-]?2(?:468|469|471|472|473)\b/ },
  { row: 'coating', key: 'chemfilm', re: /CHEM(?:ICAL)?[\s-]FILM|CONVERSION\s+COAT(?:ING)?|MIL-DTL-5541|MIL-C-5541|\bALODINE\b|\bIRIDITE\b/ },
  { row: 'coating', key: 'plating', re: /\bPLAT(?:ED|ING|E)\b(?!\s+(?:\d|THICK))|ELECTROLESS\s+NICKEL|\bNICKEL\s+PLAT|\bCHROM(?:E|IUM)\s+PLAT|\bCADMIUM\b|\bZINC\s+(?:PLAT|COAT)|QQ-P-416|AMS[\s-]?(?:2404|2403|2417|2438|2750|2759\/\d)|MIL-C-26074|\bSILVER\s+PLAT|\bGOLD\s+PLAT|\bTIN\s+PLAT|\bHARD\s+CHROME\b/ , skip: (t) => /\bPLATE\b/.test(t) && !/PLAT(?:ED|ING)|NICKEL|CADMIUM|ZINC|CHROM|SILVER|GOLD|TIN\s+PLATE|QQ-P|AMS/.test(t) },
  { row: 'coating', key: 'passivation', re: /\bPASSIVAT(?:E|ED|ION|ING)\b|AMS[\s-]?2700|ASTM\s?A[\s-]?967|QQ-P-35/ },
  { row: 'coating', key: 'blackoxide', re: /BLACK\s+OXIDE|MIL-DTL-13924|MIL-C-13924/ },
  { row: 'coating', key: 'dlc', re: /\bDLC\b|DIAMOND[\s-]LIKE\s+CARBON/ },
  { row: 'coating', key: 'nitriding', re: /\bNITRID(?:E|ED|ING)\b|AMS[\s-]?2759\/6/ },
  { row: 'paint', key: 'paint', re: /\bPAINT(?:ED|ING)?\b|\bTOP\s?COAT\b|\bENAMEL\b|\bLACQUER\b|MIL-PRF-(?:85285|22750|24635|46168)|MIL-C-46168|\bCARC\b|\bPRIMER\b|MIL-PRF-23377|MIL-P-23377|MIL-PRF-85582|\bEPOXY\s+(?:PRIMER|COAT)/, skip: (t) => /\bENGRAV/.test(t) && !/\b(?:PRIMER|TOP\s?COAT)\b/.test(t) },
  { row: 'paint', key: 'powder', re: /POWDER[\s-]?COAT(?:ED|ING)?/ },
  { row: 'br127', key: 'br127', re: /\bBR[\s-]?127\b/ },
  { row: 'inspect100', key: 'insp100', re: /100\s?%\s*(?:INSPECT|CHECK|VERIF|MEASUR|TEST|CMM|OF)|100\s?PERCENT\s*(?:INSPECT|CHECK|VERIF|MEASUR)|\bINSPECT\w*\s+100\s?%|\bFULL\s+INSPECTION\b|\b(?:EACH|EVERY)\s+(?:PART|PIECE|UNIT)\s+(?:SHALL\s+BE\s+|TO\s+BE\s+|MUST\s+BE\s+)?(?:INSPECT|MEASUR|CHECK)|\bALL\s+(?:PARTS|PIECES|UNITS)\s+(?:SHALL\s+BE\s+|TO\s+BE\s+)?(?:INSPECT|MEASUR)/ },
  { row: 'cleanroom', key: 'cleanroom', re: /CLEAN[\s-]?ROOM|ISO[\s-]?14644|CLEANLINESS\s+(?:LEVEL|CLASS|REQUIREMENT)|IEST-STD-CC1246|MIL-STD-1246|\bSEMI\s?F\d+|CLASS\s?(?:100|1000|10000)\s+CLEAN|\bCLEAN(?:ED)?\s+(?:AND|&)\s+(?:PACK(?:AGED|ED)?|BAG(?:GED)?)\s+IN\s+(?:A\s+)?CLEAN/ },
  { row: 'assembly', key: 'keensert', re: /\bKEEN[\s-]?SERT\b|\bKNS\d+|\bKNL\d+|\bKNH\d+/ },
  { row: 'assembly', key: 'helicoil', re: /\bHELI[\s-]?COIL\b|\bHELICAL\s+(?:COIL|INSERT)|\bWIRE\s+THREAD\s+INSERT|\bMS\s?21209|\bNAS\s?1130|\bMS\s?124651|\bSTI\b/ },
  { row: 'assembly', key: 'insert', re: /\b(?:THREADED\s+)?INSERTS?\b/, skip: (t, m, ctx) => /KEEN|HELI|\bSTI\b|MS\s?21209|NAS\s?1130|KNS\d/.test(ctx) || /\bO-?RING\b|\bINSERT\s+(?:PER|AS|SEE)\s+(?:NOTE|VIEW)/.test(t) },
  { row: 'assembly', key: 'pin', re: /\b(?:DOWEL|SPRING|ROLL|COTTER|CLEVIS|TAPER|GROOVE|SLOTTED|LOCATING|ALIGNMENT|PRESS[\s-]?FIT)\s+PINS?\b|\bPINS?\s+(?:PER|ISO|DIN|MS|NAS|AS)\s?[A-Z]?\d|\bMS\s?16555\b|\bISO\s?(?:2338|8734|8752|8750)\b|\bDIN\s?(?:6325|1481|7|1)\b|\bASME\s?B18\.8\.[12]/ },
  { row: 'assembly', key: 'screw', re: /\b(?:SOCKET\s+HEAD\s+)?(?:CAP\s+|SET\s+|MACHINE\s+|SHOULDER\s+)?(?:SCREWS?|BOLTS?|STUDS?|SHCS)\b|\bMS\s?24\d{3}\b|\bNAS\s?\d{3,4}\b|\bISO\s?(?:4762|4017|4014|7380)\b/, need: /\b(?:INSTALL|ASSEMBL|FASTEN|SECURE|SUPPLIED|PROVIDE|ATTACH|W\/|WITH|TORQUE|LOCTITE|STAKE|PRESS)\w*/, skip: (t) => /\bSCREW\s+THREADS?\b|\bTHREADS?\s+SCREW\b/.test(t) },
  { row: 'threads', key: 'unj', re: /\bUNJ[CFE]?\b|\b\d[\s-]\d{2}\s*UNJ[CF]?\b/ },
  { row: 'threads', key: 'mj', re: /\bMJ\s?\d+(?:\.\d+)?|\bM\d+(?:\.\d+)?\s*[Xx]\s*\d+(?:\.\d+)?\s*-?\s*\d[GH]\s*MJ\b|\bMJ\s+THREADS?\b/ },
  { row: 'threads', key: 'thread-other', re: /\bUNEF\b|\bUNS\b(?!\s*[A-Z]?\d{5})|\bSTUB\s+ACME\b|\bACME\b|\bBUTTRESS\b|\bLEFT[\s-]?HAND\s+THREAD|\bLH\s+THREAD|\bTHREAD\s+LH\b|\bTRAPEZOID|\bTR\d+\s?[Xx]\s?\d+/ },
  { row: 'gauges', key: 'gauge', re: /\bGO[\s/-]*NO[\s-]?GO\b|\bGAUGES?\b|\bGAGES?\b|\bOPTICAL\s+COMPARATOR\b|\bPROFILE\s+PROJECTOR\b|\bDEDICATED\s+(?:FIXTURE|GAUGE|GAGE)\b|\bSPLINE\s+(?:GAUGE|GAGE)\b|\bTHREAD\s+(?:PLUG|RING)\b/, skip: (t) => /\bSHEET\s+GAU?GE\b|\bGAUGE\s+\d+\s*(?:GA|AWG)\b|\b\d+\s?GA(?:UGE)?\s+(?:SHEET|WIRE)/.test(t) },
];
const NEGABLE = new Set(['heat', 'laser', 'engrave', 'coating', 'paint', 'br127', 'inspect100', 'cleanroom']);

function buildLines({ pages = [], notes = [], route = [], bom = [] }) {
  const L = [];
  for (const s of route) { const t = (s.items || []).map((i) => i.text).join(' '); if (!t.trim()) continue; const fromNote = /^Note/i.test(s.source || ''); L.push({ text: t, where: fromNote ? { t: 'note', n: String(s.seq) } : { t: 'step', n: String(s.seq), title: s.title || '' } }); }
  for (const n of notes) if (n && n.text) L.push({ text: n.text, where: { t: 'note', n: String(n.n) } });
  for (const p of pages) for (const ln of String(p.raw || '').split('\n')) if (ln.trim().length > 2) L.push({ text: ln, where: { t: 'page', n: String(p.n) } });
  for (const b of bom) { const t = Object.values(b || {}).filter((v) => typeof v === 'string').join(' '); if (t.trim()) L.push({ text: t, where: { t: 'bom' }, bom: true }); }
  return L;
}
const whereKey = (w) => w.t + (w.n || '');
const rank = { step: 0, note: 1, bom: 2, page: 3 };

/** Scan the lines with the rules table -> { hits: { row: [item] }, neg: { row: [item] } }. */
function scan(lines) {
  const hits = {}, neg = {};
  const add = (bucket, row, item) => { const a = (bucket[row] ||= []); const k = item.key + '|' + (item.spec || '') + '|' + (item.color || ''); const f = a.find((x) => x._k === k); if (f) { if (!f.where.some((w) => whereKey(w) === whereKey(item.where[0]))) f.where.push(item.where[0]); } else a.push({ ...item, _k: k }); };
  for (const l of lines) {
    const T = String(l.text).toUpperCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
    for (const r of RULES) {
      const re = new RegExp(r.re.source, 'g'); let m;
      while ((m = re.exec(T))) {
        if (r.skip && r.skip(T, m, T)) break;
        if (r.need && !r.need.test(T) && !l.bom) break;
        const before = T.slice(Math.max(0, m.index - 30), m.index);
        const negated = NEGABLE.has(r.row) && NEG.test(before);
        const extra = r.spec ? r.spec(T, m) : {};
        const specs = r.row === 'coating' || r.row === 'paint' || r.row === 'br127' ? uniq([...all(SPEC_RE, T), ...all(TYPE_RE, T)]).join(' ') : '';
        const sizes = r.row === 'assembly' || r.row === 'threads' ? all(SIZE_RE, T.slice(Math.max(0, m.index - 20), m.index + 60)).slice(0, 4).join(', ') : '';
        const col = r.row === 'paint' ? (T.match(COLOR_RE) || [])[1] : '';
        const qm = T.match(/\b(\d{1,3})\s*(?:X(?!\s*[\d.])|PLACES?|PLCS|HOLES|PCS|PIECES|EA)\b|\((\d{1,3})\s?X\)|\bQTY\.?\s*(\d{1,3})/); const qty = (r.row === 'assembly' || r.row === 'threads') && qm ? parseInt(qm[1] || qm[2] || qm[3], 10) : undefined;
        const item = { needle: m[0], qty, key: r.key, spec: r.row === 'br127' ? 'BR127' : extra.spec || specs || sizes || (r.key === 'unj' || r.key === 'mj' || r.key === 'thread-other' || r.key === 'gauge' || r.key === 'insp100' || r.key === 'cleanroom' ? m[0].trim() : ''), color: col ? col.toLowerCase() : undefined, where: [l.where], line: String(l.text).replace(/\s+/g, ' ').trim().slice(0, 160) };
        add(negated ? neg : hits, r.row, item); break;
      }
    }
    // engraving paint fill and its colour (row 5): an ENGRAV line (or note) that also says FILL / PAINT / ENAMEL / INK
    if (/\bENGRAV/.test(T) && /\b(FILL(?:ED)?|PAINT(?:ED)?|ENAMEL|INK(?:ED)?|COLOU?R(?:ED)?)\b/.test(T) && !/\bLASER\b/.test(T)) { const c = (T.match(COLOR_RE) || [])[1]; const negd = /\b(?:NO|WITHOUT|DO NOT)\s+(?:\w+\s+){0,2}FILL/.test(T); add(negd ? neg : hits, 'engfill', { key: 'engfill', color: c ? c.toLowerCase() : undefined, spec: '', where: [l.where], line: String(l.text).replace(/\s+/g, ' ').trim().slice(0, 160) }); }
  }
  for (const b of [hits, neg]) for (const k of Object.keys(b)) b[k] = b[k].map(({ _k, ...x }) => ({ ...x, where: x.where.sort((a, c) => rank[a.t] - rank[c.t]).slice(0, 3) }));
  return { hits, neg };
}

// ---- raw material: catalogue result first, else plastics named anywhere (DELRIN / PTFE are ours) ----
const PLASTIC = [[/\bDELRIN\b|\bPOM(?:-[CH])?\b|\bACETAL\b|\bPOLYOXYMETHYLENE\b/, 'plastic-pom', 'Delrin (POM)'], [/\bPTFE\b|\bTEFLON\b|\bPOLYTETRAFLUOROETHYLENE\b/, 'plastic-ptfe', 'Teflon (PTFE)']];
function materialRow(part, lines) {
  const m = part.material;
  const ours = part.status ? part.status !== 'rejected' : null;
  const items = [];
  if (m && (m.normalized || m.raw)) items.push({ key: 'material', spec: m.normalized || m.raw, needle: String(m.raw || '').slice(0, 24), raw: m.raw, group: m.parsed && m.parsed.group, where: [{ t: /title/i.test(m.source || '') ? 'title' : /^Note/i.test(m.source || '') ? 'note' : 'page', n: ((m.source || '').match(/\d+/) || [''])[0] }], line: String(m.raw || '').slice(0, 160), ours });
  for (const l of lines) { const T = String(l.text).toUpperCase(); for (const [re, grp, name] of PLASTIC) if (re.test(T) && !/\bO-?RINGS?\b|\bGASKET|\bSEAL\b|\bBUSHING\b/.test(T) && !items.some((i) => i.group === grp)) items.push({ key: 'material', spec: name, group: grp, where: [l.where], line: String(l.text).trim().slice(0, 160), ours: true }); }
  return items;
}

// ---- candidates for the threshold rules (applied live) ----
const DIA = '(?:[\u00D8\u2300\u2205]\\s*|\\bDIA\\.?\\s*|\\bO(?=\\d))';
const NUM = '(?:\\d+\\.\\d+|\\.\\d+|\\d+)';
function unitOf(text) {
  const T = String(text).toUpperCase();
  if (/(?:DIMENSIONS?|DIMS?\.?|UNITS?)[^.\n]{0,40}\b(?:IN\s+)?(?:MILLIMET(?:ER|RE)S?|MM)\b|\bALL\s+DIMENSIONS\s+(?:ARE\s+)?IN\s+MM\b/.test(T) || /\bMILLIMET(?:ER|RE)S?\b/.test(T)) return 'mm';
  if (/(?:DIMENSIONS?|DIMS?\.?|UNITS?)[^.\n]{0,40}\bINCH(?:ES)?\b|\bDIMENSIONS\s+ARE\s+IN\s+INCH|\bTOLERANCES?[^\n]{0,30}\bINCH/.test(T)) return 'in';
  const mm = (T.match(/\b\d+(?:\.\d+)?\s?MM\b/g) || []).length; if (mm >= 2) return 'mm';
  return null;
}
const LINE_AT = (raw, idx) => raw.slice(0, idx).split('\n').length - 1;
const compact = (x) => String(x || '').replace(/\s+/g, '').toUpperCase();
function locate(page, needle) { const k = compact(needle); if (k.length < 2) return null; const toks = (page.tokens || []).filter((x) => x.text); for (const len of [k.length, Math.min(k.length, 12), Math.min(k.length, 7), Math.min(k.length, 4)]) { const kk = k.slice(0, len); const t = toks.find((x) => compact(x.text).includes(kk)); if (t) return { x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) }; } return null; }
/** first page whose tokens contain the needle -> { page, bbox, zone } (zone grids are cached per page) */
function place(pages, needle, grids, prefer) { const order = prefer != null ? [...pages].sort((a, b) => (a.n === prefer ? -1 : b.n === prefer ? 1 : 0)) : pages; for (const p of order) { const bb = locate(p, needle); if (bb) return { page: p.n, bbox: bb, zone: zoneOf(grids.get(p.n) || (grids.set(p.n, zoneGrid(p)), grids.get(p.n)), bb) }; } return null; }
function candidates({ pages = [], notes = [] }) {
  const text = pages.map((p) => p.raw || '').join('\n'); const unit = unitOf(text);
  const out = { tol: [], fit: [], gdt: [], ra: [], dec: [] }; const seen = new Set(); const grids = new Map(); const gridOf = (p) => { if (!grids.has(p.n)) grids.set(p.n, zoneGrid(p)); return grids.get(p.n); };
  const add = (kind, o, p, raw, idx, snippet) => {
    const ctx = raw.slice(Math.max(0, idx - 60), idx + 90); const noteN = (notes.find((n) => n.text && String(n.text).includes(snippet.trim().slice(0, 12))) || {}).n;
    const k = kind + '|' + o.value + '|' + (o.tol || '') + '|' + p.n; if (seen.has(k)) return; seen.add(k);
    const bb = locate(p, snippet); out[kind].push({ ...o, page: p.n, bbox: bb, zone: bb ? zoneOf(gridOf(p), bb) : null, sheets: pages.length, note: noteN || null, line: raw.split('\n')[LINE_AT(raw, idx)].replace(/\s+/g, ' ').trim().slice(0, 140), holeCtx: /\bHOLE|\bTHRU\b|\bTHROUGH\b|\bBORE\b|\bREAM|\bDRILL/i.test(ctx) });
  };
  for (const p of pages) {
    const raw = String(p.raw || '').replace(/[\u2212\u2013]/g, '-');
    let m;
    // symmetric +-
    const sym = new RegExp('(?:(' + DIA + ')?(' + NUM + ')\\s*)?(?:\u00B1|\\+\\s*/\\s*-|\\+-)\\s*(' + NUM + ')', 'g');
    while ((m = sym.exec(raw))) { const half = parseFloat(m[3]); if (!(half >= 0 && half < 1)) continue; add('tol', { value: (m[1] ? '\u00D8' : '') + (m[2] || ''), dia: m[1] && m[2] ? parseFloat(m[2]) : null, half, text: '\u00B1' + m[3] }, p, raw, m.index, m[0]); }
    // bilateral +a / -b (also stacked on two lines)
    const bil = new RegExp('(?:(' + DIA + ')?(' + NUM + ')\\s*)?\\+\\s*(' + NUM + ')\\s*(?:/|\\n|\\s)\\s*-\\s*(' + NUM + ')', 'g');
    while ((m = bil.exec(raw))) { const a = parseFloat(m[3]), b = parseFloat(m[4]); const half = (a + b) / 2; if (!(half < 1)) continue; add('tol', { value: (m[1] ? '\u00D8' : '') + (m[2] || ''), dia: m[1] && m[2] ? parseFloat(m[2]) : null, half, text: '+' + m[3] + '/-' + m[4] }, p, raw, m.index, m[0]); }
    // ISO fits: 10 H7, O6 h6, 8 g6
    const fit = new RegExp('(?:(' + DIA + ')?(' + NUM + ')\\s*)(H|G|F|JS|K|N|P|h|g|f|js|k|n|p|M|m|E|e|D|d|R|r|S|s)(\\d{1,2})(?![A-Za-z0-9.])', 'g');
    while ((m = fit.exec(raw))) { const strong = /^(H|G|F|JS|K|N|P|h|g|f|js|k|n|p)$/.test(m[3]); if (!strong && !m[1]) continue; const it = parseInt(m[4], 10); if (it < 1 || it > 18) continue; const lowerFirst = m[3] === m[3].toLowerCase(); const ctx = raw.slice(Math.max(0, m.index - 20), m.index + 40); if (/\bM\d|\bUN[CFJ]|\bUNJ/.test(ctx.slice(15, 35)) && m[3].toUpperCase() === 'M') continue; add('fit', { value: (m[1] ? '\u00D8' : '') + m[2], dia: parseFloat(m[2]), fit: m[3] + m[4], it, letter: m[3], hole: !lowerFirst, text: m[3] + m[4] }, p, raw, m.index, m[0]); }
    // GD&T value after a characteristic name / symbol / frame bars
    const gd = /(FLATNESS|STRAIGHTNESS|PARALLELISM|PERPENDICULARITY|CYLINDRICITY|CIRCULARITY|ROUNDNESS|RUNOUT|POSITION|CONCENTRICITY|SYMMETRY|PROFILE|[\u23E4\u23E5\u25CB\u232D\u2312\u2313\u27C2\u2220\u2225\u2316\u25CE\u2197\u2330])\s*[:\-]?\s*([\u00D8\u2300\u2205]\s*)?(\.\d+|\d+\.\d+)/gi;
    while ((m = gd.exec(raw))) add('gdt', { value: m[1].length > 1 ? m[1].toLowerCase() : m[1], tolv: parseFloat(m[3]), diaZone: !!m[2], text: (m[2] ? '\u00D8' : '') + m[3] }, p, raw, m.index, m[0]);
    const frame = /[|\u2502]\s*([\u00D8\u2300\u2205]\s*)?(0?\.\d+)\s*(?:[\u24C2\u24C1MLS])?\s*[|\u2502]\s*[A-Z]/g;
    while ((m = frame.exec(raw))) add('gdt', { value: 'frame', tolv: parseFloat(m[2]), diaZone: !!m[1], text: (m[1] ? '\u00D8' : '') + m[2] }, p, raw, m.index, m[0]);
    // surface finish
    const ra = /\bR[AZ]\s*[:=]?\s*(\d+(?:\.\d+)?|\.\d+)(?:\s*(\u00B5|\u03BC|U)\s?(IN|M)?)?|(\d+(?:\.\d+)?)\s*(\u00B5|\u03BC|U)\s?(IN|M)\b\s*R[AZ]/gi;
    while ((m = ra.exec(raw))) { const val = parseFloat(m[1] || m[4]); const mu = (m[3] || m[6] || '').toUpperCase(); const um = mu === 'IN' ? val * 0.0254 : val; if (!(um > 0)) continue; if (/\bR[AZ]\s*\d+(?:\.\d+)?\s*$/i.test(m[0]) && val > 100) continue; add('ra', { value: (/RZ/i.test(m[0]) ? 'Rz' : 'Ra'), um: Math.round(um * 1000) / 1000, text: (/RZ/i.test(m[0]) ? 'Rz ' : 'Ra ') + (m[1] || m[4]) + (mu ? ' \u00B5' + mu.toLowerCase() : '') }, p, raw, m.index, m[0]); }
    // unusual decimals: dimensions with many decimal places (not weights, dates, scales)
    const dec = /(?<![\w.\/-])(\d{1,4}\.\d{3,6})(?![\d.])/g;
    for (const ln of raw.split('\n')) { if (/\b(KG|LBS?|WEIGHT|MASS|SCALE|DATE|DRAWN|REV|SHEET|ECN|ECO)\b|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/i.test(ln)) continue; let d; dec.lastIndex = 0; while ((d = dec.exec(ln))) { const idx = raw.indexOf(ln) + d.index; const decimals = d[1].split('.')[1].length; if (/[\u00B1+]\s*$/.test(ln.slice(0, d.index)) || /\+\s*$|-\s*$/.test(ln.slice(0, d.index))) continue; add('dec', { value: d[1], decimals, text: d[1] }, p, raw, idx, d[1]); } }
  }
  return { unit, cand: out, zoneSource: [...grids.values()].map((g) => g.source)[0] || null };
}

function readQuality(pages, textLen) {
  const ocr = pages.filter((p) => p.quality && p.quality.mode === 'ocr');
  const confs = ocr.flatMap((p) => (p.tokens || []).map((t) => t.conf).filter((c) => typeof c === 'number'));
  const mean = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null; const norm = mean == null ? null : mean <= 1 ? mean * 100 : mean;
  return { ok: textLen >= 60 && (norm == null || norm >= 65), ocrPages: ocr.length, conf: norm == null ? null : Math.round(norm) };
}

/** The static checklist stored on the part: rows 1-13 (+ candidates for the live rules). */
function buildChecklist(part, pages) {
  const lines = buildLines({ pages, notes: part.notes || [], route: part.route || [], bom: part.bom || [] });
  const { hits, neg } = scan(lines); const grids = new Map();
  for (const b of [hits, neg]) for (const k of Object.keys(b)) for (const it of b[k]) { const pl = place(pages, it.needle, grids, (it.where.find((w) => w.t === 'page') || {}).n ? +(it.where.find((w) => w.t === 'page') || {}).n : null); if (pl) { it.page = pl.page; it.bbox = pl.bbox; it.zone = pl.zone; } it.sheets = pages.length; delete it.needle; }
  const text = pages.map((p) => p.raw || '').join('\n'); const rq = readQuality(pages, text.length);
  const rows = {};
  const row = (id, items, negItems) => { rows[id] = items.length ? { state: 'yes', items } : negItems && negItems.length ? { state: 'no', excluded: true, items: negItems } : { state: rq.ok ? 'no' : 'notfound', items: [] }; };
  const mat = materialRow(part, lines); for (const it of mat) { const pl = it.needle || it.line ? place(pages, it.needle || it.line.slice(0, 24), grids) : null; if (pl) { it.page = pl.page; it.bbox = pl.bbox; it.zone = pl.zone; } it.sheets = pages.length; delete it.needle; }
  rows.material = mat.length ? { state: 'yes', items: mat } : { state: 'notfound', items: [] };
  for (const id of ['heat', 'engrave', 'laser', 'engfill', 'coating', 'paint', 'br127', 'inspect100', 'cleanroom', 'assembly', 'threads', 'gauges']) row(id, hits[id] || [], neg[id]);
  const c = candidates({ pages, notes: part.notes || [] });
  return { v: 1, read: rq, unit: c.unit, rows, cand: c.cand };
}
module.exports = { RULES, scan, buildLines, buildChecklist, candidates, unitOf, readQuality, PLASTIC };
