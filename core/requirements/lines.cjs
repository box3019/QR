'use strict';
// requirements/lines: page text lines with bboxes ({t, r:{x0,y0,x1,y1}, yc}) from QR's PDF/OCR tokens, like pymupdf's get_text("dict") lines.
const { clean } = require('./util.cjs');

/** tokens: [{text, x, y, w, h, rot}] (top-left origin, points). Tokens on one baseline with a small gap form one line. */
function linesFromTokens(tokens) {
  const ts = tokens.filter((t) => t.text && t.text.trim()).map((t) => ({ ...t })).sort((a, b) => (a.rot ? 1 : 0) - (b.rot ? 1 : 0) || a.y + a.h - (b.y + b.h) || a.x - b.x);
  const out = []; let cur = null;
  for (const t of ts) {
    const sameRow = cur && !t.rot && !cur.rot && Math.abs(t.y + t.h - cur.base) <= Math.max(1, 0.3 * t.h) && t.x - cur.r.x1 < 1.5 * Math.max(t.h, cur.h) && t.x >= cur.r.x1 - 0.5 * t.h;
    if (sameRow) {
      const gap = t.x - cur.r.x1;
      cur.t += (gap > 0.15 * t.h && !/\s$/.test(cur.t) && !/^\s/.test(t.text) ? ' ' : '') + t.text;
      cur.r = { x0: Math.min(cur.r.x0, t.x), y0: Math.min(cur.r.y0, t.y), x1: Math.max(cur.r.x1, t.x + t.w), y1: Math.max(cur.r.y1, t.y + t.h) };
    } else {
      cur = { t: t.text, r: { x0: t.x, y0: t.y, x1: t.x + t.w, y1: t.y + t.h }, base: t.y + t.h, h: t.h, rot: t.rot };
      out.push(cur);
    }
  }
  return out.map((l) => ({ t: clean(l.t).trim(), r: l.r })).filter((l) => l.t).map((l) => ({ ...l, yc: (l.r.y0 + l.r.y1) / 2 }));
}
/** Lines dumped from pymupdf (validation): [{t, bbox:[x0,y0,x1,y1]}]. */
const linesFromPymupdf = (arr) => arr.map((l) => ({ t: l.t, r: { x0: l.bbox[0], y0: l.bbox[1], x1: l.bbox[2], y1: l.bbox[3] }, yc: (l.bbox[1] + l.bbox[3]) / 2 }));
module.exports = { linesFromTokens, linesFromPymupdf };
