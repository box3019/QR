'use strict';
// core/ocr/chart: region OCR for a ruled "PRODUCTION ROUTING CHART" table on a page without a text layer.
// Whole-page tiled OCR (core/pdf.cjs ocrPage) cuts a table into fragments at tile seams and loses rows. This finds the
// table's ruled box on a low-DPI render, erases the ruling lines, and OCRs the box as ONE uniform block, so every row is read whole.
// Pure helpers (findAnchor, detectBox, eraseRules) take plain pixel data so tests run without a PDF.

/** The chart title among OCR/text tokens: PRODUCTION ... ROUTING ... CHART (or ROUTING CHART). Returns {x,y,w,h} in points or null. */
function findAnchor(tokens) {
  const ts = (tokens || []).filter((t) => t.text && !t.rot);
  const isR = (t) => /^ROUT[I1L]NG$/i.test(t.text.replace(/[^A-Za-z0-9]/g, ''));
  for (const r of ts.filter(isR)) {
    const near = ts.filter((t) => Math.abs(t.y + t.h / 2 - (r.y + r.h / 2)) < r.h * 0.8 && Math.abs(t.x - r.x) < r.h * 14);
    const chart = near.some((t) => /^CHART$/i.test(t.text.replace(/[^A-Za-z]/g, '')));
    const prod = near.some((t) => /^PRODUCT[I1]ON$/i.test(t.text.replace(/[^A-Za-z0-9]/g, '')));
    if (chart || prod) {
      const xs = near.filter((t) => /^(PRODUCT[I1]ON|ROUT[I1L]NG|CHART)$/i.test(t.text.replace(/[^A-Za-z0-9]/g, '')));
      const x0 = Math.min(...xs.map((t) => t.x)), x1 = Math.max(...xs.map((t) => t.x + t.w));
      return { x: x0, y: r.y, w: x1 - x0, h: r.h };
    }
  }
  return null;
}

/**
 * Ruled box around (ax, ay): nearest long vertical rule left and right of the anchor on gray pixels.
 * gray: Uint8 luminance, w x h. minRun in px. Returns {x0,y0,x1,y1} or null.
 */
function detectBox(gray, w, h, ax, ay, opts = {}) {
  ax = Math.round(ax); ay = Math.round(ay);
  const dark = opts.dark || 170, minRun = opts.minRun || 120, gap = opts.gap || 2;
  const isD = (x, y) => gray[y * w + x] < dark;
  const runAt = (x) => {
    let y0 = -1;
    for (let dy = -3; dy <= 3 && y0 < 0; dy++) { const y = ay + dy; if (y >= 0 && y < h && isD(x, y)) y0 = y; }
    if (y0 < 0) return null;
    let a = y0, b = y0, miss = 0;
    for (let y = y0 - 1; y >= 0; y--) { if (isD(x, y)) { a = y; miss = 0; } else if (++miss > gap) break; }
    miss = 0;
    for (let y = y0 + 1; y < h; y++) { if (isD(x, y)) { b = y; miss = 0; } else if (++miss > gap) break; }
    return b - a >= minRun ? [a, b] : null;
  };
  let L = null, R = null;
  for (let x = Math.floor(ax); x >= Math.max(0, ax - (opts.maxHalf || w)); x--) { const r = runAt(x); if (r) { L = { x, r }; break; } }
  for (let x = Math.ceil(ax); x < Math.min(w, ax + (opts.maxHalf || w)); x++) { const r = runAt(x); if (r) { R = { x, r }; break; } }
  if (!L || !R || R.x - L.x < (opts.minWidth || 200)) return null;
  // the borders may continue into the title block below: cap the height at the shorter border
  const y0 = Math.max(L.r[0], R.r[0]), y1 = Math.min(L.r[1], R.r[1]);
  return y1 - y0 > minRun ? { x0: L.x, y0, x1: R.x, y1 } : null;
}

/** Whiten ruling lines in place: dark runs longer than `vMin` vertically or `hMin` horizontally. gray: Uint8Array w x h. */
function eraseRules(gray, w, h, opts = {}) {
  const dark = opts.dark || 170, vMin = opts.vMin || 90, hMin = opts.hMin || 150;
  const kill = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) { let s = -1; for (let y = 0; y <= h; y++) { const d = y < h && gray[y * w + x] < dark; if (d && s < 0) s = y; if (!d && s >= 0) { if (y - s >= vMin) for (let k = s; k < y; k++) kill[k * w + x] = 1; s = -1; } } }
  for (let y = 0; y < h; y++) { let s = -1; for (let x = 0; x <= w; x++) { const d = x < w && gray[y * w + x] < dark; if (d && s < 0) s = x; if (!d && s >= 0) { if (x - s >= hMin) for (let k = s; k < x; k++) kill[y * w + k] = 1; s = -1; } } }
  for (let i = 0; i < kill.length; i++) if (kill[i]) gray[i] = 255;
  return gray;
}

function toGray(rgba, n) { const g = new Uint8Array(n); for (let i = 0; i < n; i++) g[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000; return g; }

/** Horizontal rules: row-bands of the table. gray: w x h luminance. Returns rule centre lines [y...] (px), runs >= minFrac of the width. */
function horizontalRules(gray, w, h, opts = {}) {
  const dark = opts.dark || 170, minFrac = opts.minFrac || 0.4, gap = opts.gap || 3;
  const need = w * minFrac, ys = [];
  for (let y = 0; y < h; y++) {
    let best = 0, run = 0, miss = 0;
    for (let x = 0; x < w; x++) { if (gray[y * w + x] < dark) { run++; miss = 0; if (run > best) best = run; } else if (++miss > gap) run = 0; }
    if (best >= need) ys.push(y);
  }
  const out = []; let s = null, p = null;
  for (const y of ys) { if (s === null) s = p = y; else if (y - p <= 2) p = y; else { out.push([s, p]); s = p = y; } }
  if (s !== null) out.push([s, p]);
  return out; // [[y0, y1] thickness spans]
}
/** Vertical rules (x spans) whose run covers >= minFrac of the height. */
function verticalRules(gray, w, h, opts = {}) {
  const dark = opts.dark || 170, minFrac = opts.minFrac || 0.6, gap = opts.gap || 3;
  const need = h * minFrac, xs = [];
  for (let x = 0; x < w; x++) {
    let best = 0, run = 0, miss = 0;
    for (let y = 0; y < h; y++) { if (gray[y * w + x] < dark) { run++; miss = 0; if (run > best) best = run; } else if (++miss > gap) run = 0; }
    if (best >= need) xs.push(x);
  }
  const out = []; let s = null, p = null;
  for (const x of xs) { if (s === null) s = p = x; else if (x - p <= 2) p = x; else { out.push([s, p]); s = p = x; } }
  if (s !== null) out.push([s, p]);
  return out;
}

const fixNo = (t) => String(t || '').replace(/\s+/g, '').replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/S/g, '5').replace(/,/g, '.').replace(/\.+$/, '');
const NO_RE = /^\d{1,3}(\.\d{1,2})?$/;

async function makeWorker(opts) {
  const fsx = require('fs'), path = require('path');
  const { createWorker } = require('tesseract.js');
  const langPath = opts.langPath || path.join(__dirname, '..', '..', 'ocr');
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
  return {
    async read(png, psm, whitelist) {
      await worker.setParameters({ tessedit_pageseg_mode: String(psm), preserve_interword_spaces: '1', tessedit_char_whitelist: whitelist || '' });
      const { data } = await worker.recognize(png, {}, { blocks: true });
      if (workerError) throw workerError;
      const words = [];
      for (const b of data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words) {
        const t = wd.text.trim();
        if (t && wd.confidence >= 20) words.push({ text: t, x0: wd.bbox.x0, y0: wd.bbox.y0, x1: wd.bbox.x1, y1: wd.bbox.y1, conf: wd.confidence });
      }
      return words;
    },
    close: () => worker.terminate().catch(() => {}),
  };
}

/** words of one cell -> text lines in reading order (baseline clustering). */
function cellLines(words) {
  const ws = words.slice().sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const lines = [];
  for (const w of ws) {
    const yc = (w.y0 + w.y1) / 2, hh = w.y1 - w.y0;
    const l = lines.find((q) => Math.abs(q.yc - yc) < Math.max(hh, q.h) * 0.6);
    if (l) { l.ws.push(w); l.yc = (l.yc * (l.ws.length - 1) + yc) / l.ws.length; l.h = Math.max(l.h, hh); } else lines.push({ yc, h: hh, ws: [w] });
  }
  lines.sort((a, b) => a.yc - b.yc);
  return lines.map((l) => ({ text: l.ws.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(' '), yc: l.yc, h: l.h, x0: Math.min(...l.ws.map((w) => w.x0)), x1: Math.max(...l.ws.map((w) => w.x1)), conf: Math.min(...l.ws.map((w) => w.conf)) }));
}

/**
 * OCR the chart of one page, cell by cell. Returns { box (points), rows, text, words } or null when there is no anchor / box.
 *  rows: [{ no, text, lines, y (pt), conf }]  (a row without a number is a continuation / sub-header: no = '')
 *  words: synthetic tokens in the layout the requirements port expects (NO column + DESCRIPTION column), for analyzeFile.
 * opts: langPath, cachePath (same as ocrPage), dpi (default 500).
 */
async function ocrChart(file, pageNo, tokens, opts = {}) {
  const anchor = findAnchor(tokens);
  if (!anchor) return null;
  const { openPdf } = require('../pdf.cjs');
  const { createCanvas } = require('@napi-rs/canvas');
  const doc = await openPdf(file);
  let wk = null;
  try {
    const page = await doc.getPage(pageNo);
    const lo = 100 / 72, vlo = page.getViewport({ scale: lo });
    const W = Math.ceil(vlo.width), H = Math.ceil(vlo.height);
    const c = createCanvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    await page.render({ canvasContext: ctx, viewport: vlo, background: 'white' }).promise;
    const gray0 = toGray(ctx.getImageData(0, 0, W, H).data, W * H);
    const bx = detectBox(gray0, W, H, (anchor.x + anchor.w / 2) * lo, (anchor.y + anchor.h / 2) * lo, { minRun: Math.round(30 / 25.4 * 100), minWidth: Math.round(60 / 25.4 * 100) });
    if (!bx) return null;
    const pad = 3;
    const box = { x0: (bx.x0 + pad) / lo, y0: (bx.y0 + pad) / lo, x1: (bx.x1 - pad) / lo, y1: (bx.y1 - pad) / lo };
    const dpi = opts.dpi || 500, scale = dpi / 72;
    const vp = page.getViewport({ scale });
    const w = Math.ceil((box.x1 - box.x0) * scale), h = Math.ceil((box.y1 - box.y0) * scale);
    const cv = createCanvas(w, h), cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: cx, viewport: vp, transform: [1, 0, 0, 1, -box.x0 * scale, -box.y0 * scale], background: 'white' }).promise;
    const g = toGray(cx.getImageData(0, 0, w, h).data, w * h);
    const hr = horizontalRules(g, w, h, { minFrac: 0.4 });
    const vr = verticalRules(g, w, h, { minFrac: 0.6 });
    eraseRules(g, w, h, { vMin: Math.round(dpi * 0.22), hMin: Math.round(dpi * 0.4) });
    const gcv = createCanvas(w, h), gc = gcv.getContext('2d'), im = gc.createImageData(w, h);
    for (let i = 0; i < g.length; i++) { im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = g[i]; im.data[i * 4 + 3] = 255; }
    gc.putImageData(im, 0, 0);
    // columns: NO | DESCRIPTION | (OPER | DATE). noX = first vertical rule, descRight = the next one (or the box edge)
    const noX = vr.length ? Math.round((vr[0][0] + vr[0][1]) / 2) : Math.round(w * 0.08);
    const descRight = vr.length > 1 ? vr[1][0] : w;
    // bands between horizontal rules (rule spans excluded)
    const edges = [[-1, -1], ...hr, [h, h]];
    const bands = [];
    for (let i = 0; i + 1 < edges.length; i++) { const y0 = edges[i][1] + 1, y1 = edges[i + 1][0] - 1; if (y1 - y0 > dpi * 0.05) bands.push([y0, y1]); }
    wk = await makeWorker(opts);
    const crop = (x0, y0, x1, y1, sc = 1) => { const cw = Math.max(1, Math.round((x1 - x0) * sc)), ch = Math.max(1, Math.round((y1 - y0) * sc)); const t = createCanvas(cw, ch), tc = t.getContext('2d'); tc.fillStyle = '#fff'; tc.fillRect(0, 0, cw, ch); tc.drawImage(gcv, x0, y0, x1 - x0, y1 - y0, 0, 0, cw, ch); return t.toBuffer('image/png'); };
    const rows = [];
    for (const [y0, y1] of bands) {
      const mg = 4;
      let no = '';
      const cx0 = Math.max(0, noX + 4), cy0 = y0 + mg;
      const nw = await wk.read(crop(cx0, cy0, descRight - 1, y1 - mg), 6);
      // digits are where OCR slips (6/8/9, 0/O): re-read every numeric word alone at 3x with a digits-only whitelist
      for (const q of nw) {
        if (!/^[\d.,]{3,}$/.test(q.text)) continue;
        const rr = await wk.read(crop(cx0 + q.x0 - 6, cy0 + q.y0 - 6, cx0 + q.x1 + 6, cy0 + q.y1 + 6, 3), 7, '0123456789.');
        const t = rr.map((z) => z.text).join('');
        if (/^[\d.]{3,}$/.test(t) && t !== q.text) { q.alt = q.text; q.text = t; q.reread = true; }
      }
      const cellNo = await wk.read(crop(0, y0 + mg, noX - 3, y1 - mg, 2), 7, '0123456789.');
      const nt = fixNo(cellNo.map((q) => q.text).join(''));
      if (NO_RE.test(nt)) no = nt;
      const lines = cellLines(nw);
      if (!lines.length && !no) continue;
      rows.push({ no, lines: lines.map((l) => l.text), text: lines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim(), y: box.y0 + ((y0 + y1) / 2) / scale, h: (y1 - y0) / scale, conf: lines.length ? Math.min(...lines.map((l) => l.conf)) / 100 : 0, cellNo: nt });
    }
    // synthetic layout tokens (what a text-layer chart looks like to the requirements port)
    const lineH = 6, noPt = box.x0 + (noX / scale) / 2, descPt = box.x0 + noX / scale + 6;
    const words = [];
    const hdrY = box.y0 + (bands.length ? bands[0][0] / scale : 0);
    const first = rows.find((r) => r.no);
    const topY = first ? first.y - first.h / 2 - 14 : hdrY;
    words.push({ text: 'NO.', x: noPt, y: topY, w: 8, h: lineH, source: 'ocr', conf: 1, rot: false, chart: true });
    words.push({ text: 'DESCRIPTION', x: descPt, y: topY, w: 52, h: lineH, source: 'ocr', conf: 1, rot: false, chart: true });
    for (const r of rows) {
      if (r.no) words.push({ text: r.no, x: noPt, y: r.y - lineH / 2, w: 2.4 * r.no.length, h: lineH, source: 'ocr', conf: 1, rot: false, chart: true });
      const m = r.lines.length, sp = Math.min(7, 20 / Math.max(1, m));
      r.lines.forEach((t, k) => words.push({ text: t, x: descPt, y: r.y - lineH / 2 + (k - (m - 1) / 2) * sp, w: Math.min(300, 3 * t.length), h: lineH, source: 'ocr', conf: Math.max(0.3, r.conf), rot: false, chart: true }));
    }
    const text = ['PRODUCTION ROUTING CHART', ...rows.filter((r) => r.text || r.no).map((r) => (r.no ? r.no + ' ' : '') + r.text)].join('\n');
    return { box, anchor, dpi, rows, text, words };
  } finally { if (wk) await wk.close(); await doc.destroy().catch(() => {}); }
}

/** The page text with OCR words inside the chart box removed, then the clean chart text appended. */
function rawWithChart(raw, ocrWords, chart) {
  if (!chart) return raw;
  const b = chart.box;
  const inside = (t) => { const cx = t.x + t.w / 2, cy = t.y + t.h / 2; return cx >= b.x0 - 2 && cx <= b.x1 + 2 && cy >= b.y0 - 2 && cy <= b.y1 + 2; };
  return raw + '\n' + (ocrWords || []).filter((t) => t.conf >= 0.6 && !inside(t)).map((t) => t.text).join(' ') + '\n' + chart.text;
}
/** Replace the page's OCR tokens inside the chart box with the region read. */
function mergeChartTokens(tokens, chart) {
  if (!chart || !chart.words.length) return tokens;
  const b = chart.box;
  const inside = (t) => { const cx = t.x + t.w / 2, cy = t.y + t.h / 2; return cx >= b.x0 - 2 && cx <= b.x1 + 2 && cy >= b.y0 - 2 && cy <= b.y1 + 2; };
  return tokens.filter((t) => !(t.source === 'ocr' && inside(t))).concat(chart.words);
}

module.exports = { findAnchor, detectBox, eraseRules, horizontalRules, verticalRules, cellLines, fixNo, ocrChart, mergeChartTokens, rawWithChart };





