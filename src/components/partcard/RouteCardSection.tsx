// "For route card": customer specs and certificate / report / traceability requirements, grouped by routing step.
// Neutral and collapsed: never a status colour, never a question, never counted as missing (they are needed later, for the route card).
import React from 'react';
import { t } from '../../i18n';
import { localized as L } from '../../i18n/localized';

function Groups({ rc }: any) {
  return <>{rc.groups.map((g: any) => <div className="qr-rc-g" key={g.key} data-testid="rc-group">
    <div className="qr-rc-h">{g.key === 'general' ? t('rcard.general') : <><bdi className="qr-ltr">{g.seq}</bdi> {L(g, 'title') || L(g, 'type')}</>}</div>
    <ul className="qr-rc-list">{g.items.map((i: any, n: number) => <li key={n} data-testid="rc-item" data-kind={i.kind}>
      {i.kind === 'spec'
        ? <><bdi className="qr-ltr qr-rc-num">{i.number}</bdi> <span className="qr-muted">{L(i, 'desc')} · {t('rcard.spec')}</span></>
        : <><span>{L(i, 'text')}</span>{i.number ? <> <bdi className="qr-ltr qr-rc-num">{i.number}</bdi></> : null}</>}
    </li>)}</ul>
  </div>)}</>;
}

/** One part: a collapsed details block; null when the part has nothing for the route card. */
export function RouteCardSection({ part, open }: { part: any; open?: boolean }) {
  const rc = part && part.routeCard; if (!rc || !rc.count) return null;
  return <details className="qr-rc" data-testid="route-card" open={open}>
    <summary className="qr-rc-sum" title={t('tip.routeCard')}>{t('rcard.title')} <span className="qr-muted">({rc.count})</span></summary>
    <p className="qr-rc-note qr-muted">{t('rcard.note')}</p>
    <Groups rc={rc} />
  </details>;
}

/** Summary step: every part that has route-card items, collapsed as one block. */
export function RouteCardSummary({ parts }: { parts: any[] }) {
  const list = parts.filter((p) => p.routeCard && p.routeCard.count);
  if (!list.length) return null;
  const total = list.reduce((n, p) => n + p.routeCard.count, 0);
  return <details className="qr-rc qr-rc-sum-all" data-testid="route-card-summary">
    <summary className="qr-rc-sum" title={t('tip.routeCard')}>{t('rcard.sumTitle')} <span className="qr-muted">({total})</span></summary>
    <p className="qr-rc-note qr-muted">{t('rcard.note')}</p>
    {list.map((p, i) => <details className="qr-rc qr-rc-part" key={p.id || i} data-testid="route-card-part">
      <summary className="qr-rc-sum"><bdi className="qr-ltr pn">{p.partNo || (p.drawing && p.drawing.name)}</bdi> <span className="qr-muted">({p.routeCard.count})</span></summary>
      <Groups rc={p.routeCard} />
    </details>)}
  </details>;
}
