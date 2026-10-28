// Part card: the Alex checklist in route-card order, plus the Precision level and Complexity indicators. Colours only for yes / no / not found.
import React from 'react';
import { t } from '../i18n';
import { evaluate, ROWS } from '../../core/checklist/live.mjs';
import { getCkSettings } from './store';
import { itemWhat, whereText, focusOf } from './format';

const GLYPH: any = { yes: '\u2713', no: '\u2013', notfound: '?' };
export const stateLabel = (s: string) => t('ck.' + s);
export function State({ s }: any) { return <span className="qr-ck-s" data-s={s} data-testid="ck-state">{GLYPH[s]} {stateLabel(s)}</span>; }
const MAXI = 8;

function Items({ row, onFocus, pid }: any) {
  const items: any[] = row.items || []; if (!items.length) return <span className="qr-muted">{row.state === 'notfound' ? t('ck.nfWhy') : ''}</span>;
  const rows = items.slice(0, MAXI);
  return <ul className="qr-ck-items">{rows.map((i: any, n: number) => { const f = onFocus ? focusOf(i, 'ck-' + pid + '-' + row.id + n) : null; const w = whereText(i);
    const body = <><span data-testid="ck-what">{itemWhat(i)}</span>{i.derived ? <span className="qr-muted"> ({t('ck.derived', { x: t('ck.r.' + (i.derived === 'fit' ? 'tight' : 'threads')) })})</span> : null}{row.excluded ? <span className="qr-muted"> ({t('ck.excluded')})</span> : null}</>;
    const full = itemWhat(i) + (w ? ' \u2014 ' + w : '');
    return <li key={n} data-testid="ck-item" data-zone={i.zone ? i.zone.label : ''} title={full}>{f ? <button type="button" className="qr-ck-link" title={t('ck.show') + ': ' + full} onClick={() => onFocus(f)}>{body}</button> : body}{w ? <span className="qr-ck-where qr-muted" data-testid="ck-where"> {'\u2014'} {w}</span> : null}</li>; })}
    {items.length > MAXI && <li className="qr-muted">{t('ck.more', { n: items.length - MAXI })}</li>}</ul>;
}
export function Indicators({ ev }: any) {
  const p = ev.precision, c = ev.complexity, k = c.counts || {};
  const tightest = p.tightest ? [itemWhat(p.tightest), whereText(p.tightest)].filter(Boolean).join(' \u2014 ') : '';
  const whyP = p.level === 'unknown' ? t('ck.prec.whyUnknown') : p.level === 'standard' ? t('ck.prec.whyStandard') : t('ck.prec.why', { n: p.count, x: tightest });
  const whyC = t('ck.cx.why', { steps: k.steps || 0, coat: k.coatings || 0, asm: k.asmKinds || 0, thr: k.threads || 0, tight: k.tight || 0 });
  return <div className="qr-ck-ind" data-testid="ck-indicators">
    <div title={t('ck.prec.title') + ': ' + t('ck.prec.' + p.level) + ' \u2014 ' + whyP + '\n' + t('tip.ckPrec', { t: ev.th.tolMm, i: ev.th.tolIn, it: ev.th.fitMaxIT, r: ev.th.raUm })}><b>{t('ck.prec.title')}</b> <span className="qr-ck-lvl" data-lvl={p.level} data-testid="ck-prec-level">{t('ck.prec.' + p.level)}</span> <span className="qr-muted" data-testid="ck-prec-why">{whyP}</span></div>
    <div title={t('ck.cx.title') + ': ' + t('ck.cx.' + c.level) + ' \u2014 ' + whyC + '\n' + t('tip.ckCx')}><b>{t('ck.cx.title')}</b> <span className="qr-ck-lvl" data-lvl={c.level} data-testid="ck-cx-level">{t('ck.cx.' + c.level)}</span> <span className="qr-muted" data-testid="ck-cx-why">{whyC}</span></div>
  </div>;
}
export function ChecklistBody({ part, onFocus }: any) {
  const ev = evaluate(part, getCkSettings()); const R: any = Object.fromEntries(ev.rows.map((r: any) => [r.id, r]));
  return <>
    <Indicators ev={ev} />
    {ev.read && !ev.read.ok && <div className="qr-ck-warn" data-testid="ck-lowread">{t('ck.lowRead')}</div>}
    {ev.zoneEstimated && <div className="qr-muted qr-ck-zn" data-testid="ck-zone-note">{t('ck.zoneNote')}</div>}
    <table className="qr-ck-tab"><tbody>{ev.order.map((g: string) => <React.Fragment key={g}>
      <tr className="qr-ck-gh"><th colSpan={2}>{t('ck.g.' + g)}</th></tr>
      {ROWS.filter((r: any) => r.group === g).map((r: any) => { const row = R[r.id]; return <tr key={r.id} data-testid={'ck-row-' + r.id} data-s={row.state} className={r.sub ? 'qr-ck-sub' : ''}>
        <td className="qr-ck-l">{t('ck.r.' + r.id)}</td><td className="qr-ck-w"><State s={row.state} /><Items row={row} onFocus={onFocus} pid={part.id || part.partNo} /></td></tr>; })}
    </React.Fragment>)}</tbody></table>
  </>;
}
export function ChecklistSection({ part, onFocus }: any) {
  if (!part || !part.checklist) return <div className="qr-ck qr-muted" data-testid="checklist-none">{t('ck.none')}</div>;
  return <details className="qr-ck" open data-testid="checklist"><summary title={t('tip.checklist')}>{t('ck.title')}</summary>
    <ChecklistBody part={part} onFocus={onFocus} />
  </details>;
}
