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
/** Left-drag pan: new scroll position from the drag start (only scroll moves, nothing else). */
export const panTo = (start, dx, dy) => ({ left: start.left - dx, top: start.top - dy });
