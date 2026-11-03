'use strict';
// Exact text-run boxes on a drawing page (PDF text layer or OCR words). Never invents a position.
const compact = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
const boxOf = (t) => ({ x: +t.x || 0, y: +t.y || 0, w: +t.w || 0, h: +t.h || 0 });
const union = (ts) => {
  const x0 = Math.min(...ts.map((t) => t.x)), y0 = Math.min(...ts.map((t) => t.y));
  const x1 = Math.max(...ts.map((t) => t.x + t.w)), y1 = Math.max(...ts.map((t) => t.y + t.h));
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
};
const sameBox = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
const uniq = (arr) => arr.filter((b, i) => b && b.w > 0 && b.h > 0 && !arr.slice(0, i).some((o) => sameBox(o, b)));

/** Tokens on one baseline, left to right. */
function linesOf(tokens) {
  const toks = (tokens || []).filter((t) => t && String(t.text || '').trim());
  const sorted = [...toks].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const lines = [];
  for (const t of sorted) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(t.y - last[0].y) > Math.max(t.h || 0, last[0].h || 0, 4) * 0.7) lines.push([t]);
    else last.push(t);
  }
  return lines;
}

/** Boxes of the exact compact needle on one page. Empty when the run is not on the page. */
function findRuns(tokens, needle) {
  const k = compact(needle);
  if (k.length < 2) return [];
  const out = [];
  for (const line of linesOf(tokens)) {
    let s = '';
    const spans = [];
    for (const t of line) {
      const c = compact(t.text);
      spans.push({ start: s.length, end: s.length + c.length, t });
      s += c;
    }
    let i = 0;
    while ((i = s.indexOf(k, i)) >= 0) {
      const end = i + k.length;
      const used = spans.filter((sp) => sp.end > i && sp.start < end);
      if (used.length) out.push(union(used.map((sp) => sp.t)));
      i += Math.max(1, k.length);
    }
  }
  return uniq(out);
}

/** First box on a page, or null. Kept for callers that only need one rectangle. */
function locate(page, needle) {
  const boxes = findRuns(page && page.tokens, needle);
  return boxes[0] || null;
}

/** Every exact hit across pages: { page, bbox:[{x,y,w,h}, ...], hits:[{page,x,y,w,h}] } or null. */
function placeAll(pages, needle, prefer) {
  const hits = [];
  for (const p of pages || []) {
    for (const b of findRuns(p.tokens, needle)) hits.push({ page: p.n, ...b });
  }
  if (!hits.length) return null;
  if (prefer != null) hits.sort((a, b) => (a.page === prefer ? -1 : b.page === prefer ? 1 : a.page - b.page));
  const page = hits[0].page;
  const bbox = hits.filter((h) => h.page === page).map(({ x, y, w, h }) => ({ x, y, w, h }));
  return { page, bbox, hits };
}

/** Optional `source: { page, bbox[] }` plus the first box for zone / legacy `page`+`bbox`. */
function attach(it, pages, needle, prefer) {
  const pl = placeAll(pages, needle, prefer);
  if (!pl) return it;
  it.page = pl.page;
  it.bbox = pl.bbox[0];
  it.source = { page: pl.page, bbox: pl.bbox };
  if (pl.hits.length > pl.bbox.length) it.source.hits = pl.hits;
  return it;
}

const normalizeBox = (b) => {
  if (!b) return null;
  if (Array.isArray(b)) {
    if (typeof b[0] === 'object' && b[0]) return normalizeBox(b[0]);
    if (b.length >= 4 && Number.isFinite(+b[0])) return { x: +b[0], y: +b[1], w: +b[2], h: +b[3] };
    return null;
  }
  if (Number.isFinite(+b.x) && Number.isFinite(+b.w) && Number.isFinite(+b.h)) return { x: +b.x, y: +b.y, w: +b.w, h: +b.h };
  return null;
};

/** Read stored location from an item. Never invents boxes. */
function sourceOf(it) {
  if (!it) return null;
  const raw = it.source && typeof it.source === 'object' && !Array.isArray(it.source) ? it.source : null;
  const page = (raw && raw.page) || it.page;
  let boxes = [];
  if (raw && Array.isArray(raw.hits) && raw.hits.length) boxes = raw.hits.map((h) => ({ page: h.page || page, ...normalizeBox(h) })).filter((b) => b && b.w > 0);
  else if (raw && Array.isArray(raw.bbox)) boxes = raw.bbox.map((b) => normalizeBox(b)).filter(Boolean).map((b) => ({ page, ...b }));
  else {
    const one = normalizeBox(it.bbox);
    if (one) boxes = [{ page, ...one }];
  }
  if (!page || !boxes.length) return null;
  return { page: boxes[0].page || page, bbox: boxes.map(({ x, y, w, h }) => ({ x, y, w, h })), hits: boxes };
}

module.exports = { compact, boxOf, findRuns, locate, placeAll, attach, sourceOf, normalizeBox, union };
