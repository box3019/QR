'use strict';
// Drawing zones (the grid letters / numbers printed on the sheet border), so every precise feature can say "sheet 2, zone B4".
// 1) labels: read the border labels (letters along the left/right edge, numbers along the top/bottom edge) from the page tokens (vector text or OCR);
//    the grid is taken as printed (works for ASME Y14.1: 1 on the right, A at the bottom; and for ISO 5457: 1 on the left, A at the top).
// 2) estimated: when the labels cannot be read, the sheet is divided like ISO 5457 / ASME Y14.1 do: an EVEN number of equal zones per side, each zone
//    25-75 mm long (smallest such even number), columns numbered 1.. from the LEFT, rows lettered A.. from the TOP. The zone is then marked "estimated".
const LETTERS = 'ABCDEFGHJKLMNPRTUVWY'; // I, O, Q, S, X, Z are never used on drawing borders
const PT_MM = 25.4 / 72;
const BAND = 0.09; // border band, fraction of the sheet size
const cx = (t) => t.x + t.w / 2, cy = (t) => t.y + t.h / 2;

/** even zone count for a side of `mm` millimetres (ISO 5457: 25..75 mm each) */
function zoneCount(mm) { for (let n = 2; n <= 24; n += 2) if (mm / n <= 75) return n; return 24; }

/** consecutive run check: labels sorted along the axis form a (reversed) consecutive series; returns the series or null */
function series(items, kind) {
  if (items.length < 3) return null;
  const idx = (s) => (kind === 'num' ? parseInt(s, 10) : LETTERS.indexOf(s));
  const sorted = [...items].sort((a, b) => a.pos - b.pos); const v = sorted.map((i) => idx(i.label));
  if (v.some((x) => x < 0 || Number.isNaN(x))) return null;
  const asc = v.every((x, i) => i === 0 || x === v[i - 1] + 1), desc = v.every((x, i) => i === 0 || x === v[i - 1] - 1);
  return asc || desc ? sorted : null;
}
function edgeItems(page, axis, edges, test, kind) {
  const W = page.width, H = page.height; const out = { a: [], b: [] };
  for (const t of page.tokens || []) {
    const s = String(t.text || '').trim(); if (!test(s)) continue;
    const x = cx(t), y = cy(t);
    const side = axis === 'x' ? (y < H * BAND ? 'a' : y > H * (1 - BAND) ? 'b' : null) : (x < W * BAND ? 'a' : x > W * (1 - BAND) ? 'b' : null);
    if (!side) continue;
    out[side].push({ label: s, pos: axis === 'x' ? x : y });
  }
  // de-duplicate the same label twice on an edge (title block text) by keeping the series that is valid
  return [series(out.a, kind), series(out.b, kind)].filter(Boolean).sort((p, q) => q.length - p.length)[0] || null;
}
function bounds(items, size) { // cell edges = midpoints between neighbouring label centres, outer edges = sheet edges
  const e = [0]; for (let i = 1; i < items.length; i++) e.push((items[i - 1].pos + items[i].pos) / 2); e.push(size);
  return items.map((it, i) => ({ label: it.label, a: e[i], b: e[i + 1] }));
}
/** { cols: [{label,a,b}], rows: [...], source: 'labels'|'estimated' } for one page */
function zoneGrid(page) {
  const W = page.width, H = page.height;
  const nums = edgeItems(page, 'x', null, (s) => /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 24, 'num');
  const lets = edgeItems(page, 'y', null, (s) => /^[A-Z]$/.test(s) && LETTERS.includes(s), 'let');
  if (nums && lets) return { cols: bounds(nums, W), rows: bounds(lets, H), source: 'labels' };
  const nc = zoneCount(W * PT_MM), nr = zoneCount(H * PT_MM);
  return { cols: Array.from({ length: nc }, (_, i) => ({ label: String(i + 1), a: (W / nc) * i, b: (W / nc) * (i + 1) })), rows: Array.from({ length: nr }, (_, i) => ({ label: LETTERS[i], a: (H / nr) * i, b: (H / nr) * (i + 1) })), source: 'estimated' };
}
/** zone of a bbox {x,y,w,h} (or [x,y,w,h]) -> { label: 'B4', estimated: bool } or null */
function zoneOf(grid, bbox) {
  if (!grid || !bbox) return null; const b = Array.isArray(bbox) ? { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] } : bbox;
  const X = b.x + b.w / 2, Y = b.y + b.h / 2;
  const find = (arr, v) => arr.find((c) => v >= Math.min(c.a, c.b) && v < Math.max(c.a, c.b)) || (v < Math.min(arr[0].a, arr[0].b) ? arr[0] : arr[arr.length - 1]);
  const c = find(grid.cols, X), r = find(grid.rows, Y);
  return { label: r.label + c.label, estimated: grid.source !== 'labels' };
}
module.exports = { zoneGrid, zoneOf, zoneCount, LETTERS };
