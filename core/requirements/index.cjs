'use strict';
// requirements: drawing requirements extraction. Logic ported from notes_extractor.py by Alex Krylov's friend (see CREDITS in README).
const { linesFromTokens, linesFromPymupdf } = require('./lines.cjs');
const { analyzePage } = require('./page.cjs');

/**
 * file + QR extractPdf pages -> per-page results. Text lines come from MuPDF (same as the original script).
 * A page with no text layer uses QR's OCR tokens when there are any (the original stops at NEEDS_OCR).
 */
async function analyzeFile(file, qrPages = []) {
  let mu = null;
  try { mu = await require('./mupdf.cjs').pageLines(file); } catch { mu = null; }
  const pages = mu || qrPages.map((p) => ({ n: p.n, width: p.width, lines: null }));
  return pages.map((p) => {
    let lines = p.lines ? linesFromPymupdf(p.lines) : [];
    let ocr = false;
    const q = qrPages.find((x) => x.n === p.n);
    if (!lines.length && q && q.tokens && q.tokens.some((t) => t.source === 'ocr')) { lines = linesFromTokens(q.tokens); ocr = true; }
    else if (!lines.length && !mu && q) lines = linesFromTokens(q.tokens || []);
    const r = analyzePage(lines, p.width);
    return { page: p.n, ...r, source: ocr && r.source ? r.source + ' (OCR)' : r.source, engine: mu ? 'mupdf' : 'pdfjs' };
  });
}
module.exports = { analyzeFile, analyzePage, linesFromTokens, linesFromPymupdf };
