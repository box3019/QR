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
export const focusOf = (i: any, id: string) => (i.bbox && i.page ? { page: i.page, bbox: i.bbox, id } : null);
