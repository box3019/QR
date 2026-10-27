'use strict';
// requirements/mupdf: page text lines exactly as pymupdf's get_text("dict") gives them (same MuPDF engine, WASM build),
// so the ported logic sees the same input as the original notes_extractor.py. Coordinates are unrotated like pymupdf.
const fs = require('fs');
const { clean } = require('./util.cjs');
let lib = null;
const load = async () => (lib = lib || (await import('mupdf')));
const FLAGS = 'preserve-whitespace,preserve-ligatures,clip,use-cid-for-unknown-unicode';

/** Rotated-page box (mupdf.js) -> unrotated page box (pymupdf). */
function derotate(b, rot, W, H) {
  const [x0, y0, x1, y1] = b;
  if (rot === 90) return [y0, W - x1, y1, W - x0];
  if (rot === 180) return [W - x1, H - y1, W - x0, H - y0];
  if (rot === 270) return [H - y1, x0, H - y0, x1];
  return [x0, y0, x1, y1];
}
/** file -> [{n, width, lines:[{t, bbox}]}]; width is the rotated page width (pymupdf page.rect.width). */
async function pageLines(file) {
  const m = await load();
  const doc = m.Document.openDocument(fs.readFileSync(file), 'application/pdf');
  const out = [];
  try {
    for (let i = 0; i < doc.countPages(); i++) {
      const page = doc.loadPage(i);
      const [bx0, by0, bx1, by1] = page.getBounds(); const W = bx1 - bx0, H = by1 - by0;
      let rot = 0; try { rot = ((Number(String(page.getObject().getInheritable('Rotate'))) || 0) % 360 + 360) % 360; } catch { rot = 0; }
      const lines = []; let cur = null;
      page.toStructuredText(FLAGS).walk({
        beginLine(bbox) { cur = { b: bbox, t: '' }; },
        onChar(c) { cur.t += c; },
        endLine() { const t = clean(cur.t).trim(); if (t) lines.push({ t, bbox: derotate(cur.b, rot, W, H) }); },
      });
      out.push({ n: i + 1, width: W, lines });
    }
  } finally { doc.destroy?.(); }
  return out;
}
module.exports = { pageLines, derotate };
