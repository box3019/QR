// Summary step: one compact card, rows = parts. Part, Precision, Complexity, Material, then one cell per route-card group.
// Full words only, never abbreviated, one line per item. A group cell lists its items in full words; when the table would not fit the card,
// the widest groups switch to "N items" (full words) one at a time. A row expands (click) to the full checklist in route-card order.
import React from 'react';
import { t } from '../i18n';
import { evaluate, ROWS, GROUPS } from '../../core/checklist/live.mjs';
import { getCkSettings } from './store';
import { itemWhat } from './format';
import { materialShort } from '../../core/checklist/short.mjs';
import { ChecklistBody } from './Checklist';

const GLYPH: any = { yes: '\u2713', no: '\u2013', notfound: '?' };
const LISTED = GROUPS.filter((g: string) => g !== 'material');
export function ChecklistSummary({ parts, goPart }: any) {
  const tabRef = React.useRef<HTMLTableElement>(null); const [wd, setWd] = React.useState(0);
  const key = wd + '|' + (parts || []).length + '|' + t('ck.col.part'); const [st, setSt] = React.useState<{ key: string; col: string[] }>({ key, col: [] }); const col: string[] = st.key === key ? st.col : [];
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  React.useLayoutEffect(() => { const card = tabRef.current && tabRef.current.parentElement; if (!card || typeof ResizeObserver === 'undefined') return; const ro = new ResizeObserver(() => setWd(Math.round(card.clientWidth))); ro.observe(card); return () => ro.disconnect(); });
  React.useLayoutEffect(() => {
    const el = tabRef.current; const card = el && el.parentElement; if (!el || !card) return;
    const cs = getComputedStyle(card); const inner = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (el.offsetWidth <= inner + 1) return;
    const ths = el.tHead ? Array.from(el.tHead.rows[0].cells) : []; let best = ''; let bw = 0;
    LISTED.forEach((g: string, i: number) => { if (col.includes(g)) return; const w = (ths[4 + i] as HTMLElement | undefined)?.offsetWidth || 0; if (w > bw) { bw = w; best = g; } });
    if (best) setSt({ key, col: [...col, best] });
  });
  const list = (parts || []).filter((p: any) => p.status !== 'rejected'); if (!list.length) return null;
  const s = getCkSettings(); const evs = list.map((p: any) => evaluate(p, s));
  if (!evs.some((e: any) => e.has)) return null;
  const rowTip = (r: any, has: boolean) => { const st = has ? r.state : 'notfound'; const what = (r.items || []).slice(0, 6).map((x: any) => itemWhat(x)).join('; '); return t('ck.r.' + r.id) + ': ' + t('ck.' + st) + (what ? ' \u2014 ' + what : ''); };
  const groupCell = (e: any, g: string) => {
    const rows = e.rows.filter((r: any) => r.group === g).slice().sort((a: any, b: any) => ROWS.findIndex((x: any) => x.id === a.id) - ROWS.findIndex((x: any) => x.id === b.id));
    const tip = rows.map((r: any) => rowTip(r, e.has)).join('\n');
    const shown = rows.filter((r: any) => !e.has || r.state !== 'no');
    const st = !e.has ? 'notfound' : rows.some((r: any) => r.state === 'yes') ? 'yes' : rows.some((r: any) => r.state === 'notfound') ? 'notfound' : 'no';
    const yes = rows.filter((r: any) => e.has && r.state === 'yes').length;
    let body: any;
    if (g === 'material') body = rows[0] && e.has && rows[0].state === 'yes' ? <bdi className="qr-ltr">{materialShort(rows[0].items[0].spec)}</bdi> : GLYPH[rows[0] && e.has ? rows[0].state : 'notfound'];
    else if (!shown.length) body = GLYPH.no;
    else if (col.includes(g)) body = <span className="qr-cks-t" data-s={st} data-testid={'cks-count-' + g}>{yes ? (yes === 1 ? t('ck.items.one') : t('ck.items.many', { n: yes })) : GLYPH.notfound}</span>;
    else body = shown.map((r: any) => <span key={r.id} className="qr-cks-t" data-s={e.has ? r.state : 'notfound'} data-testid={'cks-' + r.id}>{GLYPH[e.has ? r.state : 'notfound']} {t('ck.s.' + r.id)}{r.id === 'tight' && r.state === 'yes' ? '\u00A0\u00D7' + r.items.length : ''}</span>);
    return <td key={g} className="qr-cks-g" data-s={st} title={tip} data-testid={'cks-g-' + g}>{body}</td>;
  };
  const ncol = 4 + LISTED.length;
  return <details className="qr-cks qr-cks-card" open data-testid="checklist-summary"><summary title={t('tip.checklistSum')}>{t('ck.sumTitle')}</summary>
    <table className="qr-cks-tab" ref={tabRef}>
      <thead><tr><th>{t('ck.col.part')}</th><th>{t('ck.prec.title')}</th><th>{t('ck.cx.title')}</th>{GROUPS.map((g: string) => <th key={g}>{g === 'material' ? t('ck.g.material') : t('ck.g.' + g)}</th>)}</tr></thead>
      <tbody>{list.map((p: any, i: number) => { const e = evs[i]; const rk = String(p.id || i) + ':' + i; const isOpen = !!open[rk]; const flip = () => setOpen((o) => ({ ...o, [rk]: !o[rk] }));
        return <React.Fragment key={rk}>
          <tr data-testid="cks-row" data-open={isOpen ? '1' : '0'} className="qr-cks-r" onClick={(ev) => { if (!(ev.target as HTMLElement).closest('button')) flip(); }}>
            <td className="qr-cks-p"><button type="button" className="qr-cks-x" data-testid="cks-expand" aria-expanded={isOpen} title={isOpen ? t('ck.collapse') : t('ck.expand')} onClick={flip}>{isOpen ? '\u25BE' : '\u25B8'}</button><button type="button" className="qr-ck-link" title={t('tip.openPart')} onClick={() => goPart && goPart(parts.indexOf(p))}><bdi className="qr-ltr" title={p.partNo}>{p.partNo}</bdi></button></td>
            <td className="qr-cks-i" data-lvl={e.precision.level} title={t('ck.prec.why', { n: e.precision.count, x: e.precision.tightest ? itemWhat(e.precision.tightest) : '' })} data-testid="cks-prec">{t('ck.prec.' + e.precision.level)}</td>
            <td className="qr-cks-i" data-lvl={e.complexity.level} title={t('ck.cx.why', { steps: e.complexity.counts.steps || 0, coat: e.complexity.counts.coatings || 0, asm: e.complexity.counts.asmKinds || 0, thr: e.complexity.counts.threads || 0, tight: e.complexity.counts.tight || 0 })} data-testid="cks-cx">{t('ck.cx.' + e.complexity.level)}</td>
            {GROUPS.map((g: string) => groupCell(e, g))}</tr>
          {isOpen && <tr className="qr-cks-xr" data-testid="cks-expanded"><td colSpan={ncol}><div className="qr-cks-xin"><ChecklistBody part={p} /></div></td></tr>}
        </React.Fragment>; })}</tbody>
    </table></details>;
}
