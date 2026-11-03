// Drop and viewer rules: only external drops import; a drop never silently replaces an open job; viewer zoom/fit math.
const keyOf = (r) => (r && (r.rfq_no || r.subject)) || '';
/** True only for files coming from outside the app (Explorer 'Files' or Outlook's FileGroupDescriptor) and never during an internal drag. */
export function isExternalDrop(types, internalDrag) {
  if (internalDrag) return false;
  const ts = Array.from(types || []).map(String);
  return ts.includes('Files') || ts.some((x) => /FileGroupDescriptor/i.test(x));
}
/** What a finished drop does: 'new' when nothing is open, 'append' when same RFQ (or no RFQ), 'ask' when it comes from another RFQ. */
export function dropPlan(hasJob, curRfqs, newRfqs) {
  if (!hasJob) return 'new';
  const cur = new Set((curRfqs || []).map(keyOf).filter(Boolean));
  const fresh = (newRfqs || []).map(keyOf).filter(Boolean);
  if (!fresh.length || !cur.size || fresh.every((k) => cur.has(k))) return 'append';
  return 'ask';
}
/** Wheel zoom: one notch = 15 %, kept between 10 % and 800 %. */
export const zoomStep = (z, deltaY) => Math.min(8, Math.max(0.1, +(z * (deltaY < 0 ? 1.15 : 1 / 1.15)).toFixed(4)));
/** Double-click fit: whole sheet width in the visible area. */
export const fitZoom = (viewW, sheetW) => (viewW > 0 && sheetW > 0 ? Math.min(8, Math.max(0.1, viewW / sheetW)) : 1);
/** Fit the WHOLE sheet (width and height) in the visible area; zoom 1 = 1500px wide. pad = breathing room in px. */
export const fitSheet = (viewW, viewH, imgW, imgH, pad = 16, base = 1500) => { if (!(viewW > 0) || !(viewH > 0) || !(imgW > 0) || !(imgH > 0)) return 1; const sh = base * imgH / imgW; return Math.min(8, Math.max(0.1, Math.min((viewW - pad) / base, (viewH - pad) / sh))); };
/** Scroll offset that centres content of size (contentW x contentH) in a viewport (never negative). */
export const centerScroll = (viewW, viewH, contentW, contentH) => ({ left: Math.max(0, (contentW - viewW) / 2), top: Math.max(0, (contentH - viewH) / 2) });
/** Left-drag pan: new scroll position from the drag start (only scroll moves, nothing else). */
export const panTo = (start, dx, dy) => ({ left: start.left - dx, top: start.top - dy });
/** Zoom so a PDF box fills `fill` of the viewport (default 40 %). zoom 1 = 1500 px wide. */
export const zoomToBox = (viewW, viewH, imgW, imgH, bbox, fill = 0.4, base = 1500, pad = 16) => {
  if (!(viewW > 0) || !(viewH > 0) || !(imgW > 0) || !(imgH > 0) || !bbox) return 1;
  const bw = Math.max(+bbox.w || 0, 1), bh = Math.max(+bbox.h || 0, 1);
  const z = Math.min((fill * Math.max(viewW - pad, 1) * imgW) / (bw * base), (fill * Math.max(viewH - pad, 1) * imgH) / (bh * base));
  return Math.min(8, Math.max(0.1, +z.toFixed(4)));
};
/** Scroll offsets that put the box centre in the viewport centre (never negative). */
export const scrollToBox = (viewW, viewH, imgW, imgH, zoom, bbox, base = 1500) => {
  if (!bbox) return { left: 0, top: 0 };
  const k = (base * zoom) / imgW;
  const cx = (bbox.x + bbox.w / 2) * k, cy = (bbox.y + bbox.h / 2) * k;
  return { left: Math.max(0, cx - viewW / 2), top: Math.max(0, cy - viewH / 2) };
};
