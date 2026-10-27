'use strict';
// Ingest -> extract -> (OCR fallback) -> classify -> match drawing/parts list/model -> analyze.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { extractPdf, ocrPage } = require('./pdf.cjs');
const { analyzePart } = require('./analyze.cjs');
const { expand } = require('./intake/expand.cjs');
const { fileKind, modelRank } = require('./intake/classify.cjs');
const { readEmail } = require('./email/index.cjs');
const { attachRfqs } = require('./rfq/attach.cjs');

const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const isModel = (f) => fileKind(f) === 'model';

function classify(pages, name) {
  if (/\bpart\s*list\b|\bparts\s*list\b/i.test(require('path').basename(String(name)))) return 'partsList';
  const t = pages.map((p) => p.raw).join('\n');
  if (/PARTS LIST/.test(t) && /\bSeq\b/.test(t) && !/\bNOTES\s*:/.test(t) && Math.min(pages[0].width, pages[0].height) < 700) return 'partsList';
  if (/\b(NOTES|TITLE|SCALE|DRAWING|DWG)\b/.test(t) || pages[0].width > 1000) return 'drawing';
  return 'spec';
}

function findModels(partNo, drawingPath, dropped, customer, searchRoots) {
  const log = [];
  const key = String(partNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ok = (f) => isModel(f) && path.basename(f).toUpperCase().replace(/[^A-Z0-9]/g, '').includes(key);
  let hit = dropped.filter(ok);
  log.push(`Dropped files: ${hit.length ? 'found' : 'none'}`);
  if (!hit.length && drawingPath) {
    const d = path.dirname(drawingPath);
    try { hit = fs.readdirSync(d).map((n) => path.join(d, n)).filter(ok); } catch {}
    log.push(`Drawing folder ${d}: ${hit.length ? 'found' : 'none'}`);
  }
  if (!hit.length) for (const root of searchRoots || []) {
    const dir = path.join(root, customer || '', partNo || '', 'PAS PROGRAMS');
    try { if (fs.existsSync(dir)) hit = fs.readdirSync(dir).map((n) => path.join(dir, n)).filter(isModel); } catch {}
    log.push(`${dir} (read only): ${hit.length ? 'found' : 'none'}`);
    if (hit.length) break;
  }
  return { models: hit.sort((x, y) => modelRank(x) - modelRank(y)), log };
}

function stepHeader(f) {
  try {
    const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(4096); fs.readSync(fd, b, 0, 4096, 0); fs.closeSync(fd);
    const s = b.toString('latin1');
    return { fileName: (s.match(/FILE_NAME\s*\(\s*'([^']*)'/) || [])[1] || '', schema: (s.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/) || [])[1] || '', size: fs.statSync(f).size };
  } catch { return null; }
}

function locate(pages, pr) {
  const words = [];
  for (const e of pr.evidence || []) for (const w of String(e.text || '').split(/[\s,;:()"]+/)) if (w.length >= 3 && /[A-Z0-9]/.test(w)) words.push(w.toUpperCase());
  for (const m of String(pr.message).matchAll(/(?:Note |Thread |hole )(\S+)/g)) words.unshift(m[1].replace(/[.,]$/, '').toUpperCase());
  for (const w of words.slice(0, 6)) for (const p of pages) { const t = p.tokens.find((k) => k.text.toUpperCase().replace(/\s/g, '') === w.replace(/\s/g, '')) || p.tokens.find((k) => w.length >= 5 && k.text.toUpperCase().includes(w)); if (t) return { page: p.n, x: t.x, y: t.y, w: t.w, h: t.h, word: w }; }
  return null;
}

async function runPipeline(paths, settings, emit = () => {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-'));
  const errors = [];
  const { files, rfqs } = await expand(paths, tmp, { sevenZip: settings.sevenZip, readEmail, onStatus: (text) => emit({ type: 'status', text }), onError: (f, e) => { errors.push({ file: path.basename(f), text: String((e && e.message) || e) }); emit({ type: 'error', file: f, text: String((e && e.message) || e) }); } });
  for (const r of rfqs) emit({ type: 'rfq', rfq: r });
  emit({ type: 'files', files: files.map((f) => ({ path: f, name: path.basename(f) })) });
  const docs = [];
  for (const f of files) {
    if (fileKind(f) !== 'drawing' || !/\.pdf$/i.test(f.replace(/(\.pdf)+$/i, '.pdf'))) continue;
    try {
      emit({ type: 'status', text: `Reading ${path.basename(f)}` });
      const pages = await extractPdf(f);
      docs.push({ path: f, name: path.basename(f), sha256: sha256(f), pages, kind: classify(pages, f) });
    } catch (e) { emit({ type: 'error', file: f, text: String(e.message || e) }); }
  }
  const drawings = docs.filter((d) => d.kind === 'drawing').sort((x, y) => /-pas\b/i.test(x.name) - /-pas\b/i.test(y.name));
  const partsLists = docs.filter((d) => d.kind === 'partsList');
  const models = files.filter(isModel);
  const parts = [];
  for (const d of drawings) {
    const key = d.pages.map((p) => p.raw).join('\n');
    // OCR fallback per page (mandatory for pages flagged no_text / garbage / low_ratio)
    if (settings.ocr !== false) for (const p of d.pages) {
      if (p.quality.mode === 'text') continue;
      emit({ type: 'status', text: `OCR ${d.name} page ${p.n} (${p.quality.reasons.join(', ')}) at ${settings.ocrDpi || 400} DPI` });
      try {
        const t0 = Date.now();
        p.ocr = await ocrPage(d.path, p.n, p.tokens, { dpi: settings.ocrDpi || 400, langPath: settings.langPath, cachePath: settings.ocrCachePath, onProgress: (x) => emit({ type: 'progress', file: d.name, page: p.n, value: x }) });
        p.ocr.seconds = Math.round((Date.now() - t0) / 1000);
        p.tokens = p.tokens.concat(p.ocr.words);
        if (p.ocr.words.length) p.raw += '\n' + p.ocr.words.filter((w) => w.conf >= 0.6).map((w) => w.text).join(' ');
      } catch (e) { p.ocrError = String((e && e.message) || e); emit({ type: 'status', text: `OCR failed on ${d.name} page ${p.n}: ${p.ocrError}` }); }
    }
    const pl = partsLists.find((l) => { const forPn = (l.name.match(/\bfor\s+([A-Z0-9-]{5,})/i) || [])[1]; if (forPn) return d.name.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(forPn.toUpperCase().replace(/[^A-Z0-9]/g, '')) || key.toUpperCase().includes('ASSEMBLY') && key.includes(forPn.toUpperCase()) && d.name.toUpperCase().includes(forPn.toUpperCase()); const t = l.pages[0].raw; const m = t.match(/\b(\d{4}[A-Z]\d{3}-\d{3}|[A-Z0-9-]{6,})\b/g) || []; return m.some((x) => key.includes(x) && x.length >= 8); });
    try {
      const a = analyzePart({ drawing: d, partsList: pl, models, settings, library: settings.library || [] });
      const mm = findModels(a.partNo, d.path, models, a.customer, settings.searchRoots);
      a.model = mm.models[0] ? { path: mm.models[0], ...stepHeader(mm.models[0]) } : null;
      a.modelSearchLog = mm.log;
      for (const pr of a.problems) pr.loc = locate(d.pages, pr);
      for (const p of d.pages) if (p.ocrError) a.problems.unshift({ id: 'OCR' + p.n, severity: 'Info', category: 'OCR warning', message: `OCR failed on sheet ${p.n}: ${p.ocrError}. Only the PDF text layer was analyzed for this sheet.`, suggestion: 'Check the sheet visually; values in outlined/scanned text may be missing.', evidence: [], status: 'open', loc: null });
      const dup = parts.find((q) => q.partNo && q.partNo === a.partNo && q.rev === a.rev && q.customer === a.customer);
      if (dup) { (dup.duplicates = dup.duplicates || []).push(d.name); emit({ type: 'status', text: `${d.name}: same drawing as ${dup.drawing.name}, skipped` }); continue; }
      parts.push({ id: 'part' + (parts.length + 1), drawing: { path: d.path, name: d.name, sha256: d.sha256, pages: d.pages.map((p) => ({ n: p.n, width: p.width, height: p.height, quality: p.quality, ocr: p.ocr ? { dpi: p.ocr.dpi, tiles: p.ocr.tiles, seconds: p.ocr.seconds, words: p.ocr.words } : null, ocrError: p.ocrError })) }, partsList: pl ? { path: pl.path, name: pl.name } : null, ...a });
      emit({ type: 'part', part: parts[parts.length - 1] });
    } catch (e) { emit({ type: 'error', file: d.path, text: String(e.stack || e) }); }
  }
  const unknown = docs.filter((d) => d.kind === 'spec').map((d) => d.name);
  const rfqOut = attachRfqs(parts, rfqs);
  const other = files.filter((f) => !['drawing', 'model'].includes(fileKind(f))).map((f) => path.basename(f));
  return { parts, unknown, other, errors, rfqs: rfqOut, files: files.map((f) => path.basename(f)) };
}
module.exports = { runPipeline };
