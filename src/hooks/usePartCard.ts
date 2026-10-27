// Part card state: which section is open, which are confirmed; opening a section locates its source on the drawing.
import { useState } from 'react';
import { sectionRows, locate } from '../parts/breakdown.mjs';

export function usePartCard(part: any, onFocus: (f: any) => void) {
  const [open, setOpen] = useState<string | null>(null);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const toggle = (sec: any, pg: any) => {
    const k = pg.page + sec.key; setOpen(open === k ? null : k);
    const src = sectionRows(sec, pg).map((r: any) => r.src || '').join(' ');
    const dp = (part.drawing.pages || []).find((x: any) => x.n === pg.page);
    const bbox = locate(src, dp?.tokens || []);
    if (bbox) onFocus({ page: pg.page, bbox, id: 'bd-' + k });
  };
  const confirm = (k: string) => setOk({ ...ok, [k]: !ok[k] });
  return { open, ok, toggle, confirm };
}
