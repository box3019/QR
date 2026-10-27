// History: the active project with parts is recorded (last opened time = when its tab became active), newest first.
import { useEffect, useRef } from 'react';
import { tabMeta } from './store.mjs';
import { historyEntry, changed } from './history.mjs';

const qr = () => (window as any).qr;
export function useHistoryTouch(id: string, active: boolean, busy: any, parts: any[], rfqs: any[], step: number, onHistory?: (l: any[]) => void) {
  const opened = useRef(''); const last = useRef(null as any);
  useEffect(() => { if (active) { opened.current = new Date().toISOString(); last.current = null; } }, [active]);
  useEffect(() => {
    if (!active || busy || !parts.length || !qr().touchHistory) return;
    const e = historyEntry(id, tabMeta({ parts, rfqs, step }), parts, opened.current || new Date().toISOString());
    if (!changed(last.current, e)) return; last.current = e;
    const h = setTimeout(() => qr().touchHistory(e).then((l: any[]) => onHistory && onHistory(l)).catch(() => {}), 600); return () => clearTimeout(h);
  }, [active, busy, parts, rfqs, step]);
}
