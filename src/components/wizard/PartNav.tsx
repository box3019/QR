// Part view toolbar: Back to list, "Part i of n", Previous, Next part (the next one that needs action). Arrow keys and Esc work too.
import React, { useEffect } from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { nextNeeding, arrowMove, typing } from '../../parts/reason.mjs';

export function PartNav({ parts, sel, step, onBack, onGo, onLeave, rtl }: any) {
  const n = parts.length; const nx = nextNeeding(parts, sel); const part = parts[sel] || {};
  const doNext = () => (nx >= 0 ? onGo(nx) : onLeave());
  const doPrev = () => sel > 0 && onGo(sel - 1);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('.qr-modal-bg')) return;
    if (e.key === 'Escape') { e.preventDefault(); onBack(); return; } const d = arrowMove(e.key, rtl); if (!d) return; e.preventDefault(); if (d > 0) doNext(); else doPrev(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });
  return <div className="qr-pnav" data-testid="part-nav">
    <button type="button" className={MRT_BTN} data-testid="btn-back-list" title={t('pv.tipBack')} onClick={onBack}><span aria-hidden className="qr-chev qr-chev-back">{'\u2039'}</span> {t('pv.back')}</button>
    <span className="qr-pnav-title"><span className="qr-pn qr-ltr" data-testid="card-pn">{part.partNo || (part.drawing && part.drawing.name)}</span>{part.rev ? <span className="qr-muted"> {t('bd.rev')} <bdi className="qr-ltr">{part.rev}</bdi></span> : null}
      <span className="qr-muted qr-card-of" data-testid="card-of"> {t('pv.of', { i: sel + 1, n })}</span></span>
    <span style={{ flex: 1 }} />
    <button type="button" className={MRT_BTN} data-testid="btn-prev-part" disabled={sel === 0} title={sel === 0 ? t('dis.firstPart') : t('pv.tipPrev')} onClick={doPrev}><span aria-hidden className="qr-chev qr-chev-back">{'\u2039'}</span> {t('pv.prev')}</button>
    <button type="button" className={MRT_BTN_PRIMARY} data-testid="btn-next-part" title={nx >= 0 ? t('pv.tipNext') : t(step === 3 ? 'pv.tipToSummary' : 'pv.tipToDocs')} onClick={doNext}>{nx >= 0 ? t('pv.next') : t(step === 3 ? 'pv.toSummary' : 'pv.toDocs')} <span aria-hidden className="qr-chev">{'\u203a'}</span></button>
  </div>;
}
