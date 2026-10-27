// Step 1: one RFQ e-mail summary line (number, customer, sender, lines, mismatches).
import React from 'react';
import { Chip } from '../../ui/common';
import { t } from '../../i18n';

export function RfqBar({ rfq }: any) {
  const miss = rfq.match || {};
  return <div className="qr-rfq" data-testid="rfq-bar">
    <b>RFQ {rfq.rfq_no || '-'}</b>
    {rfq.assembly && <span>{t('rfq.assembly', { a: rfq.assembly })}</span>}
    <span>{t('rfq.customer', { c: rfq.customer || t('rfq.unknown') })}{rfq.intermediary ? t('rfq.via', { x: rfq.intermediary }) : ''}</span>
    <span>{t('rfq.from', { x: (rfq.original_sender?.name || rfq.sender?.name || '') + (rfq.original_sent ? ', ' + rfq.original_sent : '') })}</span>
    <span>{t('rfq.lines', { n: rfq.rows.length, list: '' })}<span className="qr-ltr">{rfq.rows.map((x: any) => x.part_no + ' x' + (x.qty ?? '?')).join(', ')}</span></span>
    {miss.rows_without_drawing?.length > 0 && <Chip t="danger">{t('rfq.noDrawing', { list: miss.rows_without_drawing.join(', ') })}</Chip>}
    {miss.parts_without_row?.length > 0 && <Chip t="attention">{t('rfq.notInRfq', { list: miss.parts_without_row.join(', ') })}</Chip>}
    {rfq.requirements?.length > 0 && <span className="qr-muted" dir="auto" title={rfq.requirements.join('\n')}>{t('rfq.reqs', { n: rfq.requirements.length })}</span>}
  </div>;
}

