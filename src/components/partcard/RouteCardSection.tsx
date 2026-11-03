// "For route card": customer specs and certificate / report / traceability requirements, grouped by routing step.
// Neutral and collapsed: never a status colour, never a question, never counted as missing (they are needed later, for the route card).
import React from 'react';
import { t } from '../../i18n';
import { localized as L } from '../../i18n/localized';
import { MrtTable, MrtHead, MrtGroup, MrtRow, OverflowLine } from '../../ui/MrtTable';

function Groups({ rc }: any) {
  return <MrtTable className="qr-rc-tab">
    <MrtHead cells={[t('ck.col.item'), t('ck.col.value'), t('ck.col.source')]} />
    <tbody>{rc.groups.map((g: any) => <React.Fragment key={g.key}>
      <MrtGroup colSpan={3} testid="rc-group">{g.key === 'general' ? t('rcard.general') : <><bdi className="qr-ltr">{g.seq}</bdi> {L(g, 'title') || L(g, 'type')}</>}</MrtGroup>
      {g.items.map((i: any, n: number) => {
        const item = i.kind === 'spec' ? String(i.number || '') : (L(i, 'text') || '');
        const val = i.kind === 'spec' ? (L(i, 'desc') || '') : (i.number ? String(i.number) : '');
        const src = i.kind === 'spec' ? t('rcard.spec') : '';
        return <MrtRow key={n} data-testid="rc-item" data-kind={i.kind}>
          <td>{i.kind === 'spec' ? <bdi className="qr-ltr qr-rc-num">{item}</bdi> : <OverflowLine className="qr-ck-body" text={item}>{item}</OverflowLine>}</td>
          <td className="qr-muted"><OverflowLine className="qr-ck-body" text={val}>{i.kind === 'spec' ? val : (i.number ? <bdi className="qr-ltr qr-rc-num">{val}</bdi> : val)}</OverflowLine></td>
          <td className="qr-muted">{src}</td>
        </MrtRow>;
      })}
    </React.Fragment>)}</tbody>
  </MrtTable>;
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
