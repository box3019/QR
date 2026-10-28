'use strict';
// PDF text + vector extraction, quality check and OCR fallback (offline Tesseract).
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let pdfjsP = null;
const pdfjs = () => (pdfjsP ||= import('pdfjs-dist/legacy/build/pdf.mjs'));

const PUA = /[\uE000-\uF8FF\uFFFD\u0000-\u0008]/;
const ENG = /^(?:M\d|\d+\.\d+|\d+|UN[CFJ]|THD|THRU|DRILL|NOTES?|MATERIAL|SEE|PER|REV|SCALE|DIA|MAX|MIN|X|[A-Z]{2,})/;

async function openPdf(file) {
  const lib = await pdfjs();
  const data = new Uint8Array(fs.readFileSync(file));
  const std = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep;
  return lib.getDocument({ data, standardFontDataUrl: std, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
}

function quality(tokens, pathOps, area) {
  const chars = tokens.reduce((n, t) => n + t.text.length, 0);
  const bad = tokens.reduce((n, t) => n + [...t.text].filter((c) => PUA.test(c)).length, 0);
  const words = tokens.flatMap((t) => t.text.split(/\s+/)).filter(Boolean);
  const eng = words.filter((w) => ENG.test(w.toUpperCase())).length;
  const nums = words.filter((w) => /^[n(]?\d*\.\d+\)?$/.test(w)).length;
  const glyphRatio = pathOps ? chars / pathOps : 99;
  const garbageRatio = chars ? bad / chars : 0;
  const reasons = [];
  if (chars < 20) reasons.push('no_text');
  if (garbageRatio > 0.15 || (words.length > 30 && eng / words.length < 0.25)) reasons.push('garbage');
  // Many vector ops vs few dimension numbers per page area => dimension values are likely outlined.
  const numsPerMm2 = nums / (area / 1e6); // per mÂ²
  if (pathOps > 2000 && (glyphRatio < 0.5 || numsPerMm2 < 400)) reasons.push('low_ratio');
  let mode = 'text';
  if (reasons.includes('no_text') || reasons.includes('garbage')) mode = 'ocr';
  else if (reasons.length) mode = 'mixed';
  return { mode, reasons, chars, nums, pathOps, glyphRatio: +glyphRatio.toFixed(3), garbageRatio: +garbageRatio.toFixed(3), numsPerM2: +numsPerMm2.toFixed(1) };
}

async function extractPdf(file) {
  const doc = await openPdf(file);
  const lib = await pdfjs();
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const tokens = [];
    let raw = '';
    let lastY = null, lastX = 0;
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      // display space (top-left origin, page /Rotate applied)
      const m = lib.Util.transform(vp.transform, it.transform);
      const h = Math.hypot(m[2], m[3]) || it.height;
      const rot = Math.abs(m[1]) > Math.abs(m[0]);
      const x = rot ? m[4] - h : m[4], y = m[5];
      if (it.str.trim()) {
        tokens.push({ text: it.str, x, y: rot ? y - it.width : y - h, w: rot ? h : it.width, h: rot ? it.width : h, source: 'text', conf: 1, rot });
        // a new line only when the baseline changes or the text jumps back to the left (stream order kept)
        if (lastY !== null && (Math.abs(lastY - y) > 1.5 || x < lastX - 2)) raw += '\n';
        else if (raw && !raw.endsWith('\n')) raw += (x - lastX > h * 1.5 ? '  ' : ' ');
        raw += it.str;
        lastY = y; lastX = x + (rot ? 0 : it.width);
      }
    }
    const ops = await page.getOperatorList();
    let pathOps = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === lib.OPS.constructPath) pathOps += (ops.argsArray[i][0] || []).length;
      else if (fn === lib.OPS.moveTo || fn === lib.OPS.lineTo || fn === lib.OPS.curveTo) pathOps++;
    }
    const areaMm2 = (vp.width * 25.4 / 72) * (vp.height * 25.4 / 72);
    pages.push({ n, width: vp.width, height: vp.height, tokens, raw: raw.replace(/[\u0000-\u0008]/g, '').replace(/[ \t]+\n/g, '\n'), quality: quality(tokens, pathOps, areaMm2) });
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}
function c0(v) { return v || 0; }

// Render one page at `dpi` as tiles and OCR every tile. OCR words that overlap a real text token are dropped
// (real text wins); the rest are added with source:'ocr' and the Tesseract confidence.
async function ocrPage(file, pageNo, existingTokens, opts = {}) {
  const dpi = opts.dpi || 400;
  const tile = opts.tile || 2400;
  const overlap = 120;
  const { createWorker } = require('tesseract.js');
  const langPath = opts.langPath || path.join(__dirname, '..', 'ocr');
  // Offline only. In Electron tesseract.js treats any langPath as a URL and fetches it ("Only absolute URLs are
  // supported"), but it always reads <cachePath>/eng.traineddata from disk first. So the bundled data is unpacked
  // once into a local cache folder (absolute path, works from UNC/asar installs) and no URL is ever used.
  const fsx = require('fs');
  const cacheDir = opts.cachePath || path.join(require('os').tmpdir(), 'qr-ocr-cache');
  const cached = path.join(cacheDir, 'eng.traineddata');
  if (!fsx.existsSync(cached) || fsx.statSync(cached).size < 1e6) {
    fsx.mkdirSync(cacheDir, { recursive: true });
    const raw = path.join(langPath, 'eng.traineddata');
    const buf = fsx.existsSync(raw) ? fsx.readFileSync(raw) : require('zlib').gunzipSync(fsx.readFileSync(path.join(langPath, 'eng.traineddata.gz')));
    fsx.writeFileSync(cached + '.tmp', buf); fsx.renameSync(cached + '.tmp', cached);
  }
  let workerError = null;
  const worker = await createWorker('eng', 1, { langPath: cacheDir, cachePath: cacheDir, cacheMethod: 'readOnly', gzip: false, logger: () => {}, errorHandler: (e) => { workerError = e; } });
  const words = [];
  let tiles = [];
  try {
  await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
  const { createCanvas } = require('@napi-rs/canvas');
  const doc = await openPdf(file);
  const page = await doc.getPage(pageNo);
  const scale = dpi / 72;
  const vp = page.getViewport({ scale });
  const W = Math.ceil(vp.width), H = Math.ceil(vp.height);
  for (let ty = 0; ty < H; ty += tile - overlap) for (let tx = 0; tx < W; tx += tile - overlap) tiles.push([tx, ty]);
  let done = 0;
  for (const [tx, ty] of tiles) {
    const w = Math.min(tile, W - tx), h = Math.min(tile, H - ty);
    if (w < 50 || h < 50) { done++; continue; }
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, -tx, -ty], background: 'white' }).promise;
    // thicken hairline CAD strokes (min-filter via 'darken' compositing) so Tesseract sees solid glyphs
    if (opts.thicken !== false) {
      const src = createCanvas(w, h); src.getContext('2d').drawImage(canvas, 0, 0);
      ctx.globalCompositeOperation = 'darken';
      const k = Math.max(1, Math.round(dpi / 200));
      for (let dx = -k; dx <= k; dx++) for (let dy = -k; dy <= k; dy++) if (dx || dy) ctx.drawImage(src, dx, dy);
      ctx.globalCompositeOperation = 'source-over';
    }
    // pass 1: horizontal text; pass 2: tile rotated 90Â° clockwise for vertical dimension text
    const rc = createCanvas(h, w);
    const rctx = rc.getContext('2d');
    rctx.translate(h, 0); rctx.rotate(Math.PI / 2); rctx.drawImage(canvas, 0, 0);
    for (const [img, rot] of [[canvas, false], [rc, true]]) {
      const { data } = await worker.recognize(img.toBuffer('image/png'), {}, { blocks: true });
      for (const b of data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words) {
        const t = wd.text.trim();
        if (!t || wd.confidence < 30 || !/[A-Z0-9]/i.test(t)) continue;
        const bb = wd.bbox;
        let x0 = bb.x0, y0 = bb.y0, x1 = bb.x1, y1 = bb.y1;
        if (rot) { x0 = bb.y0; x1 = bb.y1; y0 = h - bb.x1; y1 = h - bb.x0; }
        words.push({ text: t, x: (x0 + tx) / scale, y: (y0 + ty) / scale, w: (x1 - x0) / scale, h: (y1 - y0) / scale, source: 'ocr', conf: +(wd.confidence / 100).toFixed(2), rot });
      }
    }
    done++;
    opts.onProgress && opts.onProgress(done / tiles.length);
  }
  if (workerError) throw workerError;
  await doc.destroy();
  } finally { await worker.terminate().catch(() => {}); }
  // dedupe tile overlaps, then drop OCR words covered by real text
  const out = [];
  for (const w of words) {
    if (out.some((o) => o.text === w.text && Math.abs(o.x - w.x) < 3 && Math.abs(o.y - w.y) < 3)) continue;
    const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
    const covered = existingTokens.some((t) => cx >= t.x - 1 && cx <= t.x + t.w + 1 && cy >= t.y - 1 && cy <= t.y + t.h + 1);
    if (!covered) out.push(w);
  }
  return { dpi, tiles: tiles.length, words: out };
}

async function renderPreview(file, pageNo, maxPx = 2400) {
  const { createCanvas } = require('@napi-rs/canvas');
  const doc = await openPdf(file);
  const page = await doc.getPage(pageNo);
  const v1 = page.getViewport({ scale: 1 });
  const scale = Math.min(maxPx / v1.width, maxPx / v1.height);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const buf = canvas.toBuffer('image/png');
  await doc.destroy();
  return { png: buf, scale, width: v1.width, height: v1.height, pages: doc.numPages };
}

module.exports = { extractPdf, ocrPage, renderPreview, openPdf };


