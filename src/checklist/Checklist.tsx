// Part card: the Alex checklist as an MRT table — Item | Status | Value | Source | locate.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { evaluate, ROWS } from '../../core/checklist/live.mjs';
import { getCkSettings } from './store';
import { itemWhat, whereText, focusOf } from './format';

const GLYPH: any = { yes: '\u2713', no: '\u2013', notfound: '?' };
export const stateLabel = (s: string) => t('ck.' + s);
export function State({ s }: any) { return <span className="qr-ck-s" data-s={s} data-testid="ck-state">{GLYPH[s]} {stateLabel(s)}</span>; }
const MAXI = 8;
const COLS = 5;

function LocateBtn({ f, onFocus }: { f: any; onFocus?: (x: any) => void }) {
  if (!f) return null;
  return <button type="button" className="qr-ck-loc" data-testid="ck-locate" title={t('ck.show')} onClick={(e) => { e.stopPropagation(); onFocus && onFocus(f); }}>{'\u2316'}</button>;
}

export function OverflowLine({ className, testid, text, children }: { className: string; testid?: string; text: string; children: any }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  if (!text) return <span className={className} data-testid={testid}>{children}</span>;
  return <span className="qr-ck-line" data-overflow={over ? '1' : undefined} data-open={open ? '1' : undefined}>
    <span ref={ref} className={className} data-testid={testid} title={text}>{children}</span>
    {over ? <button type="button" className="qr-ck-more" data-testid="ck-expand" aria-expanded={open} title={open ? t('ck.valueHide') : t('ck.valueFull')} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{open ? '\u25BE' : '\u25B8'}</button> : null}
    {open ? <span className="qr-ck-full" data-testid="ck-full">{text}</span> : null}
  </span>;
}

function valueText(i: any, row: any) {
  return itemWhat(i) + (i.derived ? ' (' + t('ck.derived', { x: t('ck.r.' + (i.derived === 'fit' ? 'tight' : 'threads')) }) + ')' : '') + (row.excluded ? ' (' + t('ck.excluded') + ')' : '');
}

function ItemRows({ row, onFocus, pid, focusId, r }: any) {
  const items: any[] = row.items || [];
  if (!items.length) {
    const empty = row.state === 'notfound' ? t('ck.nfWhy') : '';
    const itemName = t('ck.r.' + r.id);
    return <tr data-testid={'ck-row-' + r.id} data-s={row.state} className={'qr-ck-item' + (r.sub ? ' qr-ck-sub' : '')}>
      <td className="qr-ck-l"><OverflowLine className="qr-ck-lab" text={itemName}>{itemName}</OverflowLine></td>
      <td className="qr-ck-st"><State s={row.state} /></td>
      <td className="qr-ck-val"><OverflowLine className="qr-ck-body" testid="ck-what" text={empty}>{empty}</OverflowLine></td>
      <td className="qr-ck-src" data-testid="ck-where"></td>
      <td className="qr-ck-locc"></td>
    </tr>;
  }
  const rows = items.slice(0, MAXI);
  return <>{rows.map((i: any, n: number) => {
    const id = 'ck-' + pid + '-' + row.id + n;
    const f = onFocus ? focusOf(i, id, row) : null;
    const w = whereText(i);
    const bodyText = valueText(i, row);
    const full = bodyText + (w ? ' \u2014 ' + w : '');
    const locTip = f ? t('ck.show') : t('ck.locateMissing');
    const click = () => { if (!f || !onFocus) return; onFocus(f); };
    const itemName = t('ck.r.' + r.id);
    return <tr key={n} className={'qr-ck-item' + (r.sub ? ' qr-ck-sub' : '')} data-testid={n === 0 ? 'ck-row-' + r.id : 'ck-item'} data-ck="item" data-zone={i.zone ? i.zone.label : ''} data-id={id} data-active={focusId === id ? 'true' : undefined} data-loc={f ? '1' : '0'} data-s={row.state} title={f ? full : locTip} onClick={click}>
      <td className="qr-ck-l">{n === 0 ? <OverflowLine className="qr-ck-lab" text={itemName}>{itemName}</OverflowLine> : ''}</td>
      <td className="qr-ck-st">{n === 0 ? <State s={row.state} /> : null}</td>
      <td className="qr-ck-val"><OverflowLine className="qr-ck-body" testid="ck-what" text={bodyText}>{bodyText}</OverflowLine></td>
      <td className="qr-ck-src"><OverflowLine className="qr-ck-where qr-muted" testid="ck-where" text={w}>{w}</OverflowLine></td>
      <td className="qr-ck-locc"><LocateBtn f={f} onFocus={onFocus} /></td>
    </tr>;
  })}
  {items.length > MAXI && <tr className="qr-ck-more-r"><td colSpan={COLS} className="qr-muted">{t('ck.more', { n: items.length - MAXI })}</td></tr>}</>;
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
export function ChecklistBody({ part, onFocus, focusId }: any) {
  const ev = evaluate(part, getCkSettings()); const R: any = Object.fromEntries(ev.rows.map((r: any) => [r.id, r]));
  const locatable = useMemo(() => {
    const out: any[] = [];
    for (const g of ev.order) for (const r of ROWS.filter((x: any) => x.group === g)) {
      const row = R[r.id];
      (row.items || []).slice(0, MAXI).forEach((i: any, n: number) => { const f = focusOf(i, 'ck-' + (part.id || part.partNo) + '-' + r.id + n, row); if (f) out.push(f); });
    }
    return out;
  }, [ev, part]);
  const box = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const el = box.current; if (!el || !onFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!locatable.length) return;
        e.preventDefault();
        const i = Math.max(0, locatable.findIndex((x) => x.id === focusId));
        const n = e.key === 'ArrowDown' ? Math.min(locatable.length - 1, i + 1) : Math.max(0, (i < 0 ? 0 : i - 1));
        onFocus(locatable[n]);
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [locatable, focusId, onFocus]);
  return <>
    <Indicators ev={ev} />
    {ev.read && !ev.read.ok && <div className="qr-ck-warn" data-testid="ck-lowread">{t('ck.lowRead')}</div>}
    {ev.zoneEstimated && <div className="qr-muted qr-ck-zn" data-testid="ck-zone-note">{t('ck.zoneNote')}</div>}
    <table className="qr-ck-tab" ref={box} tabIndex={0} data-testid="ck-list">
      <colgroup>
        <col className="qr-ck-c-item" />
        <col className="qr-ck-c-st" />
        <col className="qr-ck-c-val" />
        <col className="qr-ck-c-src" />
        <col className="qr-ck-c-loc" />
      </colgroup>
      <thead><tr>
        <th className="qr-ck-h-item">{t('ck.col.item')}</th>
        <th className="qr-ck-h-st">{t('ck.col.status')}</th>
        <th className="qr-ck-h-val">{t('ck.col.value')}</th>
        <th className="qr-ck-h-src">{t('ck.col.source')}</th>
        <th className="qr-ck-h-loc" title={t('ck.show')}>{'\u2316'}</th>
      </tr></thead>
      <tbody>{ev.order.map((g: string) => <React.Fragment key={g}>
        <tr className="qr-ck-gh"><th colSpan={COLS} data-testid={'ck-g-' + g}>{t('ck.g.' + g)}</th></tr>
        {ROWS.filter((r: any) => r.group === g).map((r: any) => <ItemRows key={r.id} r={r} row={R[r.id]} onFocus={onFocus} pid={part.id || part.partNo} focusId={focusId} />)}
      </React.Fragment>)}</tbody>
    </table>
  </>;
}
export function ChecklistSection({ part, onFocus, focusId }: any) {
  if (!part || !part.checklist) return <div className="qr-ck qr-muted" data-testid="checklist-none">{t('ck.none')}</div>;
  return <details className="qr-ck" open data-testid="checklist"><summary title={t('tip.checklist')}>{t('ck.title')}</summary>
    <ChecklistBody part={part} onFocus={onFocus} focusId={focusId} />
  </details>;
}
