// Print selected part drawings: keep only drawing PDFs from the part's job files. Never guess a missing drawing.
import { isIncluded, setInclude } from './triage.mjs';

const EXCLUDE = [
  /\.(?:msg|eml)$/i,
  /(?:^|[^a-z\u0590-\u05ff])(?:e-?mail|outlook)(?:[^a-z\u0590-\u05ff]|$)/i,
  /route[\s._-]*card|routecard|routing[\s._-]*card|routing[\s._-]*chart/i,
  /כרטיס[\s._-]*מסלול|כרטסת/,
  /operation[\s._-]*card/i,
  /certificat|(?:^|[^a-z0-9])coc(?:[^a-z0-9]|$)|(?:^|[^a-z0-9])mtr(?:[^a-z0-9]|$)|mill[\s._-]*cert|material[\s._-]*cert|c[\s._-]*of[\s._-]*c/i,
  /(?:^|[_\s.-])spec(?:ification)?(?:[_\s.-]|$)/i,
  /rafdocs/i,
  /(?:^|[_\s.-])(?:pas|mled)(?:[_\s.-]|$)/i,
  /parts?[\s._-]*list/i,
];
const DRAWING_HINT = /(?:-PD-|_PD_|-PD_|\bPD-)|drawing|שרטוט|\.dwg/i;

export function baseName(p) {
  return String(p || '').replace(/\\/g, '/').split('/').pop() || '';
}

export function isPdfName(name) {
  return baseName(name).toLowerCase().replace(/\.pdf\.pdf$/, '.pdf').endsWith('.pdf');
}

export function isExcludedJobFile(name) {
  const n = baseName(name);
  return !n || EXCLUDE.some((re) => re.test(n));
}

export function looksLikeDrawingName(name) {
  return DRAWING_HINT.test(baseName(name));
}

/** Drawing PDF: a PDF that is not a route card / certificate / spec / email. Trusted = pipeline drawing or its duplicate. */
export function isDrawingPdfName(name, trusted) {
  if (!isPdfName(name)) return false;
  if (isExcludedJobFile(name)) return false;
  return !!trusted || looksLikeDrawingName(name);
}

function asFile(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { name: baseName(entry), path: /[\\/]/.test(entry) ? entry : '', pages: null, width: 0, height: 0 };
  }
  return {
    name: baseName(entry.name || entry.path),
    path: entry.path && /[\\/]/.test(entry.path) ? entry.path : '',
    pages: entry.pages || null,
    width: Number(entry.width) || 0,
    height: Number(entry.height) || 0,
  };
}

export function jobFilesOf(part, extraFiles) {
  const out = [];
  const seen = new Set();
  const add = (entry, trusted) => {
    const f = asFile(entry);
    if (!f || !f.name) return;
    const key = (f.path || f.name).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...f, trusted: !!trusted });
  };
  if (part && part.drawing) add(part.drawing, true);
  for (const d of (part && part.duplicates) || []) add(d, true);
  for (const n of (part && part.packageFiles) || []) add(n, false);
  return out;
}

export function resolveDrawingPath(file, part, extraFiles) {
  if (file && file.path && /[\\/]/.test(file.path)) return file.path;
  const want = baseName(file && (file.name || file.path)).toLowerCase();
  if (!want) return '';
  const candidates = [];
  if (part && part.drawing && part.drawing.path) candidates.push(part.drawing.path);
  for (const d of (part && part.duplicates) || []) candidates.push(typeof d === 'string' ? d : d && d.path);
  for (const n of extraFiles || []) candidates.push(typeof n === 'string' ? n : n && n.path);
  for (const c of candidates) {
    if (c && baseName(c).toLowerCase() === want && /[\\/]/.test(c)) return c;
  }
  return '';
}

function pageCount(file, part) {
  if (file && Array.isArray(file.pages) && file.pages.length) return file.pages.length;
  const d = part && part.drawing;
  if (d && Array.isArray(d.pages) && d.pages.length && baseName(d.path || d.name).toLowerCase() === baseName((file && (file.path || file.name)) || '').toLowerCase()) return d.pages.length;
  return 1;
}

function pageSize(file, part) {
  const pages = (file && file.pages) || (part && part.drawing && part.drawing.pages) || [];
  const p = pages[0] || {};
  return { width: Number(file && file.width) || Number(p.width) || 0, height: Number(file && file.height) || Number(p.height) || 0 };
}

export function drawingPdfsOf(part, extraFiles) {
  const files = [];
  const seen = new Set();
  for (const f of jobFilesOf(part, extraFiles)) {
    if (!isDrawingPdfName(f.name || f.path, f.trusted)) continue;
    const path = resolveDrawingPath(f, part, extraFiles);
    if (!path) continue;
    const key = path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const size = pageSize(f, part);
    files.push({ path, name: f.name || baseName(path), pages: pageCount(f, part), width: size.width, height: size.height, partNo: (part && part.partNo) || '' });
  }
  return files;
}

export function includeState(parts) {
  const list = parts || [];
  const selected = list.filter(isIncluded).length;
  return { total: list.length, selected, all: list.length > 0 && selected === list.length, none: selected === 0, some: selected > 0 && selected < list.length };
}

export function setIncludeAll(parts, on) {
  return (parts || []).map((p) => setInclude(p, on));
}

export function selectedIndexes(parts) {
  return (parts || []).map((p, i) => (isIncluded(p) ? i : -1)).filter((i) => i >= 0);
}

export function printDrawingsPlan(parts, extraFiles) {
  const ready = [];
  const missing = [];
  (parts || []).forEach((part, index) => {
    if (!isIncluded(part)) return;
    const partNo = part.partNo || (part.drawing && part.drawing.name) || '';
    const files = drawingPdfsOf(part, extraFiles);
    if (!files.length) missing.push({ index, partNo, reason: 'no-drawing' });
    else ready.push({ index, partNo, files });
  });
  const files = ready.flatMap((r) => r.files);
  const pages = files.reduce((n, f) => n + (Number(f.pages) || 1), 0);
  return { selected: ready.length + missing.length, ready, missing, files, pages };
}

export function normalizePaperSize(s) {
  return String(s || '').toUpperCase() === 'A3' ? 'A3' : 'A4';
}

export function normalizeCopies(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(1, Math.min(99, Math.round(v))) : 1;
}

export function autoLandscape(file) {
  const w = Number(file && file.width) || 0;
  const h = Number(file && file.height) || 0;
  return !!(w && h && w > h);
}

export function pickDefaultPrinter(printers, last) {
  const list = printers || [];
  if (last && list.some((p) => p.name === last)) return last;
  const def = list.find((p) => p.isDefault);
  return (def && def.name) || (list[0] && list[0].name) || '';
}

export function printPayloadOf(plan, opts) {
  const o = opts || {};
  return {
    files: (plan && plan.files) || [],
    printer: String(o.printer || o.deviceName || ''),
    paperSize: normalizePaperSize(o.paperSize),
    copies: normalizeCopies(o.copies),
    fit: o.fit !== false,
    landscape: 'auto',
  };
}
