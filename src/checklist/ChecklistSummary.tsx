// Summary step: one compact card, rows = parts. Precision and Complexity right after the part; one merged cell per route-card group.
// One line per item (never wraps inside an item or a header): auto layout sized from the content; if it would overflow, items switch to
// the abbreviation dictionary (ck.sa.*), then the part number is shortened with an ellipsis. Full text stays in the tooltip.
import React from 'react';
import { t } from '../i18n';
import { evaluate, ROWS, GROUPS } from '../../core/checklist/live.mjs';
import { getCkSettings } from './store';
import { itemWhat } from './format';
import { materialShort } from '../../core/checklist/short.mjs';

const GLYPH: any = { yes: '\u2713', no: '\u2013', notfound: '?' };
export function ChecklistSummary({ parts, goPart }: any) {
  const tabRef = React.useRef<HTMLTableElement>(null); const [wd, setWd] = React.useState(0);
  const key = wd + '|' + (parts || []).length + '|' + t('ck.col.part'); const [st, setSt] = React.useState({ key, lvl: 0 }); const lvl = st.key === key ? st.lvl : 0;
  React.useLayoutEffect(() => { const card = tabRef.current && tabRef.current.parentElement; if (!card || typeof ResizeObserver === 'undefined') return; const ro = new ResizeObserver(() => setWd(Math.round(card.clientWidth))); ro.observe(card); return () => ro.disconnect(); });
  React.useLayoutEffect(() => { const el = tabRef.current; const card = el && el.parentElement; if (!el || !card) return; const cs = getComputedStyle(card); const inner = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (el.offsetWidth > inner + 1 && lvl < 2) setSt({ key, lvl: lvl + 1 }); });
  const list = (parts || []).filter((p: any) => p.status !== 'rejected'); if (!list.length) return null;
  const s = getCkSettings(); const evs = list.map((p: any) => evaluate(p, s));
  if (!evs.some((e: any) => e.has)) return null;
  const rowTip = (r: any, has: boolean) => { const st = has ? r.state : 'notfound'; const what = (r.items || []).slice(0, 6).map((x: any) => itemWhat(x)).join('; '); return t('ck.r.' + r.id) + ': ' + t('ck.' + st) + (what ? ' \u2014 ' + what : ''); };
  const groupCell = (e: any, g: string) => {
    const rows = e.rows.filter((r: any) => r.group === g).slice().sort((a: any, b: any) => ROWS.findIndex((x: any) => x.id === a.id) - ROWS.findIndex((x: any) => x.id === b.id));
    const tip = rows.map((r: any) => rowTip(r, e.has)).join('\n');
    const shown = rows.filter((r: any) => !e.has || r.state !== 'no');
    const st = !e.has ? 'notfound' : rows.some((r: any) => r.state === 'yes') ? 'yes' : rows.some((r: any) => r.state === 'notfound') ? 'notfound' : 'no';
    return <td key={g} className="qr-cks-g" data-s={st} title={tip} data-testid={'cks-g-' + g}>
      {g === 'material' ? (rows[0] && e.has && rows[0].state === 'yes' ? <bdi className="qr-ltr">{materialShort(rows[0].items[0].spec)}</bdi> : GLYPH[rows[0] && e.has ? rows[0].state : 'notfound'])
        : shown.length ? shown.map((r: any) => <span key={r.id} className="qr-cks-t" data-s={e.has ? r.state : 'notfound'} data-testid={'cks-' + r.id}>{GLYPH[e.has ? r.state : 'notfound']} {t((lvl >= 1 ? 'ck.sa.' : 'ck.s.') + r.id)}{r.id === 'tight' && r.state === 'yes' ? '\u00A0\u00D7' + r.items.length : ''}</span>) : GLYPH.no}</td>;
  };
  return <details className="qr-cks qr-cks-card" open data-testid="checklist-summary"><summary title={t('tip.checklistSum')}>{t('ck.sumTitle')}</summary>
    <table className="qr-cks-tab" ref={tabRef} data-lvl={lvl}>
            <thead><tr><th>{t('ck.col.part')}</th><th>{t('ck.prec.title')}</th><th>{t('ck.cx.title')}</th>{GROUPS.map((g: string) => <th key={g}>{t('ck.g.' + g)}</th>)}</tr></thead>
      <tbody>{list.map((p: any, i: number) => { const e = evs[i]; return <tr key={p.id || i} data-testid="cks-row">
        <td className="qr-cks-p"><button type="button" className="qr-ck-link" title={t('tip.openPart')} onClick={() => goPart && goPart(parts.indexOf(p))}><bdi className="qr-ltr" title={p.partNo}>{p.partNo}</bdi></button></td>
        <td className="qr-cks-i" data-lvl={e.precision.level} title={t('ck.prec.why', { n: e.precision.count, x: e.precision.tightest ? itemWhat(e.precision.tightest) : '' })} data-testid="cks-prec">{t('ck.prec.' + e.precision.level)}</td>
        <td className="qr-cks-i" data-lvl={e.complexity.level} title={t('ck.cx.why', { steps: e.complexity.counts.steps || 0, coat: e.complexity.counts.coatings || 0, asm: e.complexity.counts.asmKinds || 0, thr: e.complexity.counts.threads || 0, tight: e.complexity.counts.tight || 0 })} data-testid="cks-cx">{t('ck.cx.' + e.complexity.level)}</td>
        {GROUPS.map((g: string) => groupCell(e, g))}</tr>; })}</tbody>
    </table></details>;
}
