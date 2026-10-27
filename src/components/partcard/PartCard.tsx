// Step 2 part card: header (part no, rev, "part i of n"), flags on top, the friend's sections, Show table, Previous/Next.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { localized } from '../../i18n/localized';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { usePartCard } from '../../hooks/usePartCard';
import { cardPages, cardFlags } from '../../parts/breakdown.mjs';
import { CARD_SECTIONS } from './sections';
import { TableDialog } from './TableDialog';

export function PartCard({ part, n, sel, setSel, details, onFocus, goStep }: any) {
  const card = usePartCard(part, onFocus);
  const [table, setTable] = useState(false);
  const pages = cardPages(part); const flags = cardFlags(part); const last = sel >= n - 1;
  return <div className="qr-panel" data-testid="breakdown-panel">
    <div className="qr-card-h">
      <span className="qr-pn qr-ltr" data-testid="card-pn">{part.partNo}</span>{part.rev ? <span className="qr-muted"> {t('bd.rev')} {part.rev}</span> : null}
      <span className="qr-muted qr-card-of" data-testid="card-of">{t('bd.of', { i: sel + 1, n })}</span>
    </div>
    <div className="qr-scroll qr-card" data-testid="processes-panel">
      {flags.length > 0 && <div className="qr-card-flags" data-testid="card-flags">{flags.slice(0, 4).map((p: any) => <div key={p.id} data-sev={p.severity}>✕ <bdi>{localized(p, 'message')}</bdi></div>)}{flags.length > 4 && <div className="qr-muted">{t('bd.more', { n: flags.length - 4 })}</div>}</div>}
      {!pages.length && <div className="qr-muted">{t('pp.none')}</div>}
      {pages.map((pg: any) => <div key={pg.page} className="qr-card-page">
        {pages.length > 1 && <div className="qr-lbl">{t('pp.page')} {pg.page}</div>}
        {CARD_SECTIONS.map((C, i) => <C key={i} pg={pg} part={part} card={card} details={details} goStep={goStep} />)}
      </div>)}
      {pages.some((p: any) => p.rows.length) && <button type="button" className={MRT_BTN + ' qr-sec-table'} data-testid="btn-bd-table" title={t('tip.bdTable')} onClick={() => setTable(true)}>{t('bd.table')}</button>}
    </div>
    <div className="qr-card-nav">
      <button type="button" className={MRT_BTN} data-testid="btn-prev-part" disabled={sel === 0} title={t('tip.prevPart')} onClick={() => setSel(sel - 1)}>{t('bd.prev')}</button>
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="btn-next-part" title={last ? t('tip.toDocs') : t('tip.nextPart')} onClick={() => (last ? goStep(3) : setSel(sel + 1))}>{last ? t('bd.toDocs') : t('bd.nextPart')}</button>
    </div>
    {table && <TableDialog part={part} onClose={() => setTable(false)} />}
  </div>;
}
