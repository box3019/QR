// Drag a floating card by its header (pointer events), clamped to the window. The position is remembered in settings
// (settings.floatPos[key]); a double-click on the header resets it. mode 'fixed': the card is position:fixed and the
// position is its left/top. mode 'offset': the card is centred by its parent and the position is an offset from there.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampPos, sanitizePos, NO_DRAG } from './drag.mjs';

type P = { x: number; y: number };
const qr = () => (window as any).qr;
const save = (key: string, p: P | null) => { try { qr()?.setFloatPos?.(key, p); } catch { /* settings are best effort */ } };

export function useFloat(key: string, mode: 'fixed' | 'offset' = 'fixed') {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<P | null>(null);
  const drag = useRef<{ dx: number; dy: number; bx: number; by: number } | null>(null);
  const cur = useRef<P | null>(null); cur.current = pos;

  useEffect(() => { let on = true; Promise.resolve(qr()?.getSettings?.()).then((s: any) => { const p = sanitizePos(s?.floatPos?.[key]); if (on && p) setPos(p); }).catch(() => {}); return () => { on = false; }; }, [key]);

  // base = where the card would sit with no stored position (offset mode: its centred spot)
  const clampTo = useCallback((p: P): P => {
    const el = ref.current; if (!el) return p;
    const r = el.getBoundingClientRect(); const c = cur.current;
    const bx = mode === 'offset' ? r.left - (c ? c.x : 0) : 0, by = mode === 'offset' ? r.top - (c ? c.y : 0) : 0;
    const a = clampPos(p.x + bx, p.y + by, r.width, r.height, window.innerWidth, window.innerHeight);
    return { x: a.x - bx, y: a.y - by };
  }, [mode]);
  useLayoutEffect(() => { if (pos) { const n = clampTo(pos); if (n.x !== pos.x || n.y !== pos.y) setPos(n); } }, [pos, clampTo]);
  useEffect(() => { const f = () => setPos((p) => (p ? clampTo(p) : p)); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [clampTo]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(NO_DRAG) || !ref.current) return;
    const r = ref.current.getBoundingClientRect(); const c = cur.current;
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, bx: mode === 'offset' ? r.left - (c ? c.x : 0) : 0, by: mode === 'offset' ? r.top - (c ? c.y : 0) : 0 };
    e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const a = clampPos(e.clientX - d.dx, e.clientY - d.dy, r.width, r.height, window.innerWidth, window.innerHeight);
    setPos({ x: a.x - d.bx, y: a.y - d.by });
  };
  const end = (e: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return; drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (cur.current) save(key, cur.current);
  };
  const onDoubleClick = (e: React.MouseEvent<HTMLElement>) => { if ((e.target as HTMLElement).closest(NO_DRAG)) return; setPos(null); save(key, null); };

  const style: React.CSSProperties | undefined = pos ? (mode === 'fixed' ? { left: pos.x, top: pos.y } : { position: 'relative', left: pos.x, top: pos.y }) : undefined;
  return { ref, style, moved: !!pos, headProps: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onDoubleClick, 'data-drag-head': '' } as any };
}
