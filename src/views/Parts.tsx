// Step 2 and 3, list view: tiles on top, then ONE row per part (part number, rev, status, one-line reason). Click a row to open that part.
import React, { useState } from 'react';
import { t } from '../i18n';
import { Chip } from '../ui/common';
import { PlainStatusBadge } from '../ui/simple';
import { tileCounts } from '../parts/groups.mjs';
import { listRows, reasonFor } from '../parts/reason.mjs';
import { localized as L } from '../i18n/localized';
import { Tiles } from '../ui/Tiles';
import { MrtTable, MrtHead, MrtRow, OverflowLine } from '../ui/MrtTable';

export function PartsList({ parts, sel, onOpen, unknown, details }: any) {
  const [filter, setFilter] = useState<string | null>(null);
  const counts = tileCounts(parts); const rows = listRows(parts, filter); const allReady = parts.length > 0 && counts.ready === parts.length;
  return <div className="qr-plist" data-testid="parts-panel">
    <div className="qr-plist-top"><Tiles counts={counts} active={filter} onPick={setFilter} /></div>
    <div className="qr-panel qr-plist-box"><div className="qr-scroll qr-plist-rows" data-testid="parts-rows">
      {allReady && !filter && <div className="qr-allgood" data-testid="all-ready"><i className="qr-dot" data-s="ok" aria-hidden="true" />{t('tile.allGood')}</div>}
      {filter && !rows.length && <div className="qr-muted qr-empty" data-testid="tile-empty">{t('tile.empty')}</div>}
      <MrtTable shell className="qr-plist-tab" cols={<colgroup><col className="qr-mrt-c-id" /><col className="qr-mrt-c-status" /><col className="qr-mrt-c-status" /><col className="qr-mrt-c-text" />{details ? <><col className="qr-mrt-c-status" /><col className="qr-mrt-c-id" /></> : null}</colgroup>}>
        <MrtHead cells={details
          ? [t('ck.col.item'), t('rc.rev'), t('ck.col.status'), t('ck.col.value'), t('parts.qty'), t('rc.customer')]
          : [t('ck.col.item'), t('rc.rev'), t('ck.col.status'), t('ck.col.value')]} />
        <tbody>
          {rows.map(({ part: p, index: i }: any) => { const r = reasonFor(p); const txt = String(r.prob ? L(r.prob, 'message') : r.text || t(r.key as string, r.vars) || '');
            return <MrtRow key={p.id || i} className="qr-prow" active={i === sel} data-status={r.status} data-testid="part-item" title={t('pl.open', { pn: p.partNo || p.drawing.name })} onClick={() => onOpen(i)}>
              <td className="qr-prow-pn pn"><bdi className="qr-ltr">{p.partNo || p.drawing.name}</bdi></td>
              <td className="qr-prow-rev qr-muted"><bdi className="qr-ltr">{p.rev || '-'}</bdi></td>
              <td className="qr-prow-st"><PlainStatusBadge part={p} /></td>
              <td><OverflowLine className="qr-prow-why" testid="part-reason" text={txt}><bdi>{txt}</bdi></OverflowLine></td>
              {details ? <td>{p.rfq ? <Chip t="neutral" testid="part-qty">{t('parts.qty')} {p.rfq.qty ?? '?'}</Chip> : ''}</td> : null}
              {details ? <td><Chip t="neutral">{p.customer}</Chip></td> : null}
            </MrtRow>; })}
          {details && unknown.length > 0 && <MrtRow className="qr-prow qr-muted"><td colSpan={details ? 6 : 4}>{t('parts.other', { list: unknown.join(', ') })}</td></MrtRow>}
        </tbody>
      </MrtTable>
    </div></div>
  </div>;
}
