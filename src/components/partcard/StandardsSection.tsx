// Part card: standards found on the drawing (ports, O-rings, inserts, threads) with dimensions, flags and the stored document.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN } from '../../ui/mrtButtons';

const api = () => (window as any).qr || {};
const fmt = (v: any) => (v && typeof v === 'object' ? `${v.mm} mm / ${v.in} in` : typeof v === 'number' ? `${v} mm` : String(v));
const thr = (x: any) => (!x ? '' : typeof x === 'string' ? x : x.text || x.raw || x.callout || '');

export function StandardsSection({ part }: any) {
  const list: any[] = part.standards || [];
  const [done, setDone] = useState<Record<string, string>>({});
  if (!list.length) return null;
  const confirm = async (s: any) => { await api().stdConfirm?.(s, part.customer || ''); setDone({ ...done, [s.id]: 'ok' }); };
  const upload = async (s: any) => { const r = await api().stdUpload?.(s, part.customer || '', `part:${part.partNo || ''}|${part.rev || ''}`); if (r) setDone({ ...done, [s.id]: r.file }); };
  return <div className="qr-std" data-testid="standards-panel">
    <div className="qr-lbl">{t('std.title')}</div>
    {list.map((s) => { const file = (s.doc && s.doc.file) || (done[s.id] && done[s.id] !== 'ok' ? done[s.id] : ''); return <div key={s.id} className="qr-std-row" data-testid="std-row" data-status={s.status}>
      <div className="qr-std-h"><bdi className="qr-ltr">{s.std}{s.dash ? '-' + s.dash : ''}{thr(s.thread) ? ' ' + thr(s.thread) : ''}</bdi>
        <span className="qr-muted"> {t('std.status.' + s.status)}</span>
        {s.doc && s.doc.rev ? <span className="qr-muted"> {t('bd.rev')} {s.doc.rev}</span> : null}
        {s.doc && s.doc.newerRev ? <span className="qr-std-newer" data-testid="std-newer"> {t('std.newerRev', { rev: s.doc.newerRev })}</span> : null}
      </div>
      {s.dims && <div className="qr-std-dims qr-ltr">{Object.entries(s.dims).map(([k, v]) => <span key={k}><b>{k}</b> {fmt(v)}</span>)}</div>}
      {(s.flags || []).filter((f: any) => f.type !== 'newerRev').map((f: any, i: number) => <div key={i} className="qr-std-flag" data-testid="std-flag">✕ <bdi className="qr-ltr">{f.drawing}</bdi> → <bdi className="qr-ltr">{f.required}</bdi></div>)}
      <div className="qr-std-btns">
        {file && <button type="button" className={MRT_BTN} data-testid="btn-std-open" title={t('tip.stdOpen')} onClick={() => api().stdOpen?.(file)}>{t('std.open')}</button>}
        {s.status === 'needsConfirm' && done[s.id] !== 'ok' && <button type="button" className={MRT_BTN} data-testid="btn-std-confirm" title={t('tip.stdConfirm')} onClick={() => confirm(s)}>{t('std.confirm')}</button>}
        {s.status === 'needsDoc' && !file && <button type="button" className={MRT_BTN} data-testid="btn-std-upload" title={t('tip.stdUpload')} onClick={() => upload(s)}>{t('std.upload')}</button>}
      </div>
    </div>; })}
  </div>;
}
