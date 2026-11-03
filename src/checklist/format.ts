// Text of one checklist item: WHAT (label + spec + quantity + colour) and WHERE (sheet, zone, note / routing step).
import { t } from '../i18n';
const tk = (k: string) => { const v = t(k); return v === k ? '' : v; };
export const keyLabel = (key: string) => tk('ck.k.' + key) || key;
export function itemWhat(i: any): string {
  if (i.kind && ['tol', 'fit', 'gdt', 'ra', 'dec'].includes(i.kind)) return [tk('ck.t.' + i.kind), i.value, i.tol].filter(Boolean).join(' ');
  const base = keyLabel(i.key);
  const spec = i.key === 'material' ? i.spec : i.spec && i.spec !== base ? i.spec : '';
  return [i.key === 'material' ? '' : base, spec, i.qty ? '\u00D7' + i.qty : '', i.color ? tk('ck.color.' + i.color) || i.color : ''].filter(Boolean).join(' \u00B7 ');
}
export function whereText(i: any): string {
  const out: string[] = [];
  if (i.page && (i.sheets || 1) > 1) out.push(t('ck.sheet', { n: i.page }));
  if (i.zone) out.push(t('ck.zone', { z: i.zone.label }) + (i.zone.estimated ? ' (' + t('ck.est') + ')' : ''));
  if (i.kind) return out.join(' \u00B7 '); // callouts on the drawing body: the zone is the place
  for (const w of i.where || []) { if (w.t === 'note') out.push(t('ck.note', { n: w.n })); else if (w.t === 'step') out.push(t('ck.step', { n: w.n })); else if (w.t === 'bom') out.push(t('ck.bom')); else if (w.t === 'title') out.push(t('ck.title_block')); }
  return [...new Set(out)].join(' \u00B7 ');
}
const asBox = (b: any) => {
  if (!b) return null;
  if (Array.isArray(b) && typeof b[0] === 'number') return { x: +b[0], y: +b[1], w: +b[2], h: +b[3] };
  if (Array.isArray(b) && b[0] && typeof b[0] === 'object') return asBox(b[0]);
  if (Number.isFinite(+b.x) && Number.isFinite(+b.w)) return { x: +b.x, y: +b.y, w: +b.w, h: +b.h };
  return null;
};
/** Stored drawing location: { page, bbox[] } from the exact text run(s). Never invents a box. */
export function sourceOf(i: any): { page: number; bbox: { x: number; y: number; w: number; h: number }[]; hits: { page: number; x: number; y: number; w: number; h: number }[] } | null {
  if (!i) return null;
  const raw = i.source && typeof i.source === 'object' && !Array.isArray(i.source) ? i.source : null;
  const page = (raw && raw.page) || i.page;
  let hits: { page: number; x: number; y: number; w: number; h: number }[] = [];
  if (raw && Array.isArray(raw.hits) && raw.hits.length) {
    hits = raw.hits.map((h: any) => { const b = asBox(h); return b ? { page: h.page || page, ...b } : null; }).filter(Boolean) as any;
  } else if (raw && Array.isArray(raw.bbox) && raw.bbox.length) {
    hits = raw.bbox.map((b: any) => { const n = asBox(b); return n ? { page: (b && b.page) || page, ...n } : null; }).filter(Boolean) as any;
  } else {
    const one = asBox(i.bbox);
    if (one && page) hits = [{ page, ...one }];
  }
  if (!page || !hits.length) return null;
  return { page: hits[0].page || page, bbox: hits.map(({ x, y, w, h }) => ({ x, y, w, h })), hits };
}
export function toneOf(i: any, row?: any) {
  if (i && typeof i.ratio === 'number' && i.ratio <= 0.5) return 'critical';
  if (row && row.state === 'yes' && !i.kind) return 'checked';
  if (i && (i.status === 'ok' || i.ours === true)) return 'checked';
  return 'accent';
}
export const focusOf = (i: any, id: string, row?: any) => {
  const s = sourceOf(i);
  if (!s) return null;
  return { page: s.hits[0].page, bbox: s.hits[0], boxes: s.hits, boxIndex: 0, id, tone: toneOf(i, row) };
};
