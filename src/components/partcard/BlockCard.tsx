// One block of the part card: status dot + one short line + at most one button; details behind a chevron.
// Pure presentation of a block from src/parts/blocks.mjs.
import React from 'react';
import { t, getLang } from '../../i18n';
import { localized } from '../../i18n/localized';
import { MRT_BTN } from '../../ui/mrtButtons';
import { Fields } from './Fields';
import { locate } from '../../parts/breakdown.mjs';
import { MrtTable, MrtHead, MrtRow } from '../../ui/MrtTable';

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
  return <MrtTable className="qr-bd-tab" testid="blk-dims">
    <MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} />
    <tbody>{e.map(([k, v]) => <MrtRow key={k} className="qr-bd-item"><td className="qr-bd-k">{labelOf(k)}</td><td className="qr-bd-v">{dimText(v).map((x, i) => <Code key={i}>{x}</Code>)}</td></MrtRow>)}</tbody>
  </MrtTable>;
}
function labelOf(k: string) { const key = 'std.dim.' + k; const v = t(key); return v === key ? <Code>{k}</Code> : v; }

function StdDetails({ d, file, onOpen }: any) {
  return <div className="qr-blk-det" data-testid="blk-details">
    {d.thread || d.flags.length || (d.doc && d.doc.rev) || d.newerRev ? <MrtTable className="qr-bd-tab">
      <MrtHead cells={[t('ck.col.item'), t('ck.col.value'), t('ck.col.source')]} />
      <tbody>
        {d.thread ? <MrtRow className="qr-bd-item"><td>{t('dv.thread')}</td><td><Code>{thr(d.thread)}</Code></td><td /></MrtRow> : null}
        {d.flags.map((f: any, i: number) => <MrtRow key={i} className="qr-bd-item" data-testid="std-flag">
          <td>{t('blk.f.' + f.type)}</td>
          <td className="qr-flag-v">{t('blk.drawing')} <Code>{String(f.drawing)}</Code></td>
          <td className="qr-flag-v">{t('blk.standard')} <Code>{String(f.required)}</Code></td>
        </MrtRow>)}
        {d.doc && d.doc.rev ? <MrtRow className="qr-bd-item"><td>{t('bd.rev')}</td><td><Code>{d.doc.rev}</Code></td><td /></MrtRow> : null}
        {d.newerRev ? <MrtRow className="qr-bd-item" data-testid="std-newer"><td>{t('ck.col.status')}</td><td colSpan={2}>{t('std.newerRev', { rev: d.newerRev })}</td></MrtRow> : null}
      </tbody>
    </MrtTable> : null}
    <Dims dims={d.dims} />
    {file && <button type="button" className={MRT_BTN} data-testid="btn-std-open" title={t('tip.stdOpen')} onClick={onOpen}>{t('std.open')}</button>}
  </div>;
}
function MaterialDetails({ d }: any) {
  return <div className="qr-blk-det" data-testid="blk-details">
    {d.raw ? <MrtTable className="qr-bd-tab" testid="bd-row-raw"><MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} /><tbody><MrtRow className="qr-bd-item"><td className="qr-bd-k">{t('bd.f.src')}</td><td className="qr-bd-v" data-field="raw"><bdi>{d.raw}</bdi></td></MrtRow></tbody></MrtTable> : null}
    {d.rows.length ? <Fields sec={d.sec} rows={d.rows} details /> : null}
  </div>;
}
function ProblemDetails({ list }: any) {
  return <div className="qr-blk-det" data-testid="blk-details"><MrtTable className="qr-bd-tab">
    <MrtHead cells={[t('ck.col.item'), t('ck.col.status'), t('ck.col.value')]} />
    <tbody>{list.map((p: any) => <MrtRow key={p.id} className="qr-bd-item" data-sev={p.severity}><td>{t('sev.' + p.severity)}</td><td data-s={p.severity}><span className="qr-ck-s" data-s={p.severity === 'Blocker' ? 'no' : 'notfound'}>{p.severity === 'Blocker' ? '\u2013' : '?'}</span></td><td><bdi>{localized(p, 'message')}</bdi></td></MrtRow>)}</tbody>
  </MrtTable></div>;
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

export function BlockCard({ block: b, open, onToggle, onAction, state, part, onFocus }: BlockViewProps & { onFocus?: (f: any) => void }) {
  const done = state && (state.confirmed || state.file);
  const status = done ? 'ok' : b.status;
  const act = done ? null : b.action;
  const title = b.kind === 'standard' ? <Code>{b.title}</Code> : <>{t(b.titleKey)}{b.page ? ` ${t('pp.page')} ${b.page}` : ''}</>;
  const val = b.kind === 'material' ? <bdi data-testid="mat-line">{localized(part && part.material, 'line') || b.value}{b.ours === true ? ` — ${t('blk.mat.ours')}` : b.ours === false ? ` — ${t('blk.mat.notOurs')}` : ''}</bdi>
    : b.kind === 'field' && b.status === 'ok' && b.value ? <bdi>{String(b.value)}</bdi> : null;
  const confirmedField = b.kind === 'field' && b.action && b.action.kind === 'confirm' && state && state.ok;
  const needle = (b.kind === 'standard' && b.title) || (b.details && b.details.raw) || b.value || '';
  const pgN = (b.pg && b.pg.page) || (b.page) || 1;
  const tokens = ((part && part.drawing && part.drawing.pages) || []).flatMap((p: any) => (p.tokens || []).map((tk: any) => ({ ...tk, _p: p.n })));
  const pageToks = ((part && part.drawing && part.drawing.pages) || []).find((p: any) => p.n === pgN)?.tokens || tokens;
  const bbox = needle ? locate(String(needle), pageToks) : null;
  const loc = bbox ? { page: pgN, bbox, boxes: [bbox], id: 'bd-' + b.id, tone: status === 'ok' || done ? 'checked' : status === 'bad' ? 'critical' : 'accent' } : null;
  return <section className="qr-block" data-testid="block" data-block={b.id} data-kind={b.kind} data-status={status} data-open={open} title={loc ? undefined : t('ck.locateMissing')}>
    <div className="qr-block-h">
      <i className="qr-dot" data-s={status} aria-hidden="true" />
      <div className="qr-block-main">
        <div className="qr-block-title" data-testid="block-title">{title}</div>
        <div className="qr-block-line" data-testid="block-line">{val || lineText(b, state, part)}</div>
      </div>
      {act && <button type="button" className={MRT_BTN} data-testid={'block-act-' + act.kind} title={t(ACTION[act.kind].tip)} onClick={() => onAction(b)}>{confirmedField ? '✓ ' : ''}{t(ACTION[act.kind].label)}</button>}
      {loc ? <button type="button" className="qr-ck-loc" data-testid="block-locate" title={t('ck.show')} onClick={(e) => { e.stopPropagation(); onFocus && onFocus(loc); }}>{'\u2316'}</button> : null}
      {!b.details && <span className="qr-block-chev" aria-hidden="true" />}
      {b.details && <button type="button" className="qr-block-chev" data-testid="block-chev" aria-expanded={open} title={t('tip.blkDetails')} onClick={onToggle}>{open ? '▾' : '▸'}</button>}
    </div>
    {open && b.details && (b.details.type === 'fields' ? <div className="qr-blk-det" data-testid="blk-details"><Fields sec={b.details.sec} rows={b.details.rows} details /></div>
      : b.details.type === 'material' ? <MaterialDetails d={b.details} />
      : b.details.type === 'standard' ? <StdDetails d={b.details} file={(b.std && b.std.doc && b.std.doc.file) || (state && state.file)} onOpen={() => (window as any).qr?.stdOpen?.((b.std && b.std.doc && b.std.doc.file) || state.file)} />
      : <ProblemDetails list={b.details.list} />)}
  </section>;
}
