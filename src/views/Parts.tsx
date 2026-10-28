// Step 2 and 3, list view: tiles on top, then ONE row per part (part number, rev, status, one-line reason). Click a row to open that part.
import React, { useState } from 'react';
import { t } from '../i18n';
import { Chip } from '../ui/common';
import { PlainStatusBadge } from '../ui/simple';
import { tileCounts } from '../parts/groups.mjs';
import { listRows, reasonFor } from '../parts/reason.mjs';
import { localized as L } from '../i18n/localized';
import { Tiles } from '../ui/Tiles';

const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '\u2026' : s);

export function PartsList({ parts, sel, onOpen, unknown, details }: any) {
  const [filter, setFilter] = useState<string | null>(null);
  const counts = tileCounts(parts); const rows = listRows(parts, filter); const allReady = parts.length > 0 && counts.ready === parts.length;
  return <div className="qr-plist" data-testid="parts-panel">
    <div className="qr-plist-top"><Tiles counts={counts} active={filter} onPick={setFilter} /></div>
    <div className="qr-panel qr-plist-box"><div className="qr-scroll qr-plist-rows" data-testid="parts-rows">
      {allReady && !filter && <div className="qr-allgood" data-testid="all-ready"><i className="qr-dot" data-s="ok" aria-hidden="true" />{t('tile.allGood')}</div>}
      {filter && !rows.length && <div className="qr-muted qr-empty" data-testid="tile-empty">{t('tile.empty')}</div>}
      {rows.map(({ part: p, index: i }: any) => { const r = reasonFor(p); const txt = r.prob ? L(r.prob, 'message') : r.text || t(r.key as string, r.vars);
        return <button type="button" key={p.id || i} className="qr-prow" data-active={i === sel} data-status={r.status} data-testid="part-item" title={t('pl.open', { pn: p.partNo || p.drawing.name })} onClick={() => onOpen(i)}>
          <span className="qr-prow-pn pn"><bdi className="qr-ltr">{p.partNo || p.drawing.name}</bdi></span>
          <span className="qr-prow-rev qr-muted"><bdi className="qr-ltr">{p.rev || '-'}</bdi></span>
          <span className="qr-prow-st"><PlainStatusBadge part={p} /></span>
          <span className="qr-prow-why" data-testid="part-reason"><bdi>{clip(String(txt || ''))}</bdi></span>
          <span className="qr-chev" aria-hidden="true">{'\u203a'}</span>
          {details && <span className="qr-prow-sub">{p.rfq && <Chip t="neutral" testid="part-qty">{t('parts.qty')} {p.rfq.qty ?? '?'}</Chip>}<Chip t="neutral">{p.customer}</Chip></span>}
        </button>; })}
      {details && unknown.length > 0 && <div className="qr-prow qr-muted">{t('parts.other', { list: unknown.join(', ') })}</div>}
    </div></div>
  </div>;
}
