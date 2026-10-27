// One block of the part card: status dot + one short line + at most one button; details behind a chevron.
// Pure presentation of a block from src/parts/blocks.mjs.
import React from 'react';
import { t, getLang } from '../../i18n';
import { localized } from '../../i18n/localized';
import { MRT_BTN } from '../../ui/mrtButtons';
import { Fields } from './Fields';

const ACTION: Record<string, { label: string; tip: string }> = {
  confirm: { label: 'bd.a.confirm', tip: 'tip.bd.confirm' },
  upload: { label: 'std.upload', tip: 'tip.stdUpload' },
  ask: { label: 'blk.ask', tip: 'tip.blkAsk' },
};
const thr = (x: any) => (!x ? '' : typeof x === 'string' ? x : x.raw || x.text || x.callout || '');
const dimText = (v: any) => (v && typeof v === 'object' ? [v.in != null ? `${v.in} in` : '', v.mm != null ? `${v.mm} mm` : ''].filter(Boolean) : [`${v} mm`]);

/** A code token (standard id, thread, number): always left-to-right, isolated from the Hebrew around it. */
export const Code = ({ children }: any) => <bdi dir="ltr" className="qr-code">{children}</bdi>;

function Dims({ dims }: any) {
  const e = Object.entries(dims || {});
  if (!e.length) return null;
  return <dl className="qr-dims" data-testid="blk-dims">{e.map(([k, v]) => <div key={k} className="qr-dim"><dt>{labelOf(k)}</dt><dd>{dimText(v).map((x, i) => <Code key={i}>{x}</Code>)}</dd></div>)}</dl>;
}
function labelOf(k: string) { const key = 'std.dim.' + k; const v = t(key); return v === key ? <Code>{k}</Code> : v; }

function StdDetails({ d, file, onOpen }: any) {
  return <div className="qr-blk-det" data-testid="blk-details">
    {d.thread && <div className="qr-flag-line"><Code>{thr(d.thread)}</Code></div>}
    {d.flags.map((f: any, i: number) => <div key={i} className="qr-flag-line" data-testid="std-flag">
      <span>{t('blk.f.' + f.type)}</span><span className="qr-flag-v">{t('blk.drawing')} <Code>{String(f.drawing)}</Code></span><span className="qr-flag-v">{t('blk.standard')} <Code>{String(f.required)}</Code></span>
    </div>)}
    <Dims dims={d.dims} />
    {d.doc && d.doc.rev ? <div className="qr-flag-line"><span>{t('bd.rev')}</span> <Code>{d.doc.rev}</Code></div> : null}
    {d.newerRev ? <div className="qr-flag-line" data-testid="std-newer">{t('std.newerRev', { rev: d.newerRev })}</div> : null}
    {file && <button type="button" className={MRT_BTN} data-testid="btn-std-open" title={t('tip.stdOpen')} onClick={onOpen}>{t('std.open')}</button>}
  </div>;
}
function ProblemDetails({ list }: any) {
  return <div className="qr-blk-det" data-testid="blk-details">{list.map((p: any) => <div key={p.id} className="qr-flag-line" data-sev={p.severity}><bdi>{localized(p, 'message')}</bdi></div>)}</div>;
}

export interface BlockViewProps { block: any; open: boolean; onToggle: () => void; onAction: (b: any) => void; state?: any; part?: any }

export function lineText(b: any, state: any, part: any): React.ReactNode {
  const L = b.line; if (!L) return null;
  if (state && state.confirmed) return t('blk.std.confirmed');
  if (state && state.file) return t('blk.std.stored');
  if (b.kind === 'verdict') return <bdi>{localized(part, 'rejectReason') || t(L.key)}</bdi>;
  if (b.kind === 'none') return (L.vars.list as string[]).map((k) => t(k)).join(', ');
  const vars: any = { ...(L.vars || {}) };
  for (const k of Object.keys(vars)) if (Array.isArray(vars[k])) vars[k] = vars[k].map((x: string) => t(x)).join(getLang() === 'he' ? ', ' : ', ');
  if (L.key === 'blk.flags') return vars.flags;
  if (L.key === 'blk.noneList') return vars.list;
  return t(L.key, vars);
}

export function BlockCard({ block: b, open, onToggle, onAction, state, part }: BlockViewProps) {
  const done = state && (state.confirmed || state.file);
  const status = done ? 'ok' : b.status;
  const act = done ? null : b.action;
  const title = b.kind === 'standard' ? <Code>{b.title}</Code> : <>{t(b.titleKey)}{b.page ? ` ${t('pp.page')} ${b.page}` : ''}</>;
  const val = b.kind === 'field' && b.status === 'ok' && b.value ? <bdi>{String(b.value)}</bdi> : null;
  const confirmedField = b.kind === 'field' && b.action && b.action.kind === 'confirm' && state && state.ok;
  return <section className="qr-block" data-testid="block" data-block={b.id} data-kind={b.kind} data-status={status} data-open={open}>
    <div className="qr-block-h">
      <i className="qr-dot" data-s={status} aria-hidden="true" />
      <div className="qr-block-main">
        <div className="qr-block-title" data-testid="block-title">{title}</div>
        <div className="qr-block-line" data-testid="block-line">{val || lineText(b, state, part)}</div>
      </div>
      {act && <button type="button" className={MRT_BTN} data-testid={'block-act-' + act.kind} title={t(ACTION[act.kind].tip)} onClick={() => onAction(b)}>{confirmedField ? '✓ ' : ''}{t(ACTION[act.kind].label)}</button>}
      {b.details && <button type="button" className="qr-block-chev" data-testid="block-chev" aria-expanded={open} title={t('tip.blkDetails')} onClick={onToggle}>{open ? '▾' : '▸'}</button>}
    </div>
    {open && b.details && (b.details.type === 'fields' ? <div className="qr-blk-det" data-testid="blk-details"><Fields sec={b.details.sec} rows={b.details.rows} details /></div>
      : b.details.type === 'standard' ? <StdDetails d={b.details} file={(b.std && b.std.doc && b.std.doc.file) || (state && state.file)} onOpen={() => (window as any).qr?.stdOpen?.((b.std && b.std.doc && b.std.doc.file) || state.file)} />
      : <ProblemDetails list={b.details.list} />)}
  </section>;
}
