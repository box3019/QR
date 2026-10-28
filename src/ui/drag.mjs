// Floating windows: pure helpers for dragging a card by its header. Positions are px from the window's top-left.
/** Keeps a w x h box fully inside a vw x vh window. */
export function clampPos(x, y, w, h, vw, vh, margin = 0) {
  const cl = (v, lo, hi) => Math.round(Math.min(Math.max(lo, v), Math.max(lo, hi)));
  return { x: cl(x, margin, vw - w - margin), y: cl(y, margin, vh - h - margin) };
}
/** Stored value -> {x, y} or null (anything that is not two finite numbers is dropped). */
export function sanitizePos(p) {
  return p && typeof p === 'object' && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
}
/** Settings.floatPos object -> only valid entries. */
export function sanitizeFloatPos(o) {
  const out = {};
  if (o && typeof o === 'object') for (const k of Object.keys(o)) { const p = sanitizePos(o[k]); if (p) out[k] = p; }
  return out;
}
/** Elements inside the header that keep their own click/drag behaviour. */
export const NO_DRAG = 'select, button, input, textarea, a, label, [role=button]';
