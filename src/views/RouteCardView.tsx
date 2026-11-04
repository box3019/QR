// Route card table: operations, instructions, specs, optional source, flags.
import React from 'react';
import { Chip } from '../ui/common';
import { t, getLang } from '../i18n';
import { PlainStatusBadge } from '../ui/simple';
import { MrtTable, MrtHead, MrtEmpty, MrtRow, OverflowLine } from '../ui/MrtTable';
import { opLabel, sameRouteSource } from './routeCard.mjs';

const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
const OL = (text: string, children?: any) => <OverflowLine className="qr-ck-body" text={text}>{children ?? text}</OverflowLine>;

export function RouteCard({ part }: any) {
  const hideSrc = sameRouteSource((part.route || []).map((s: any) => L(s, 'source')));
  const cols = hideSrc
    ? <colgroup><col className="qr-rcard-c-step" /><col className="qr-rcard-c-op" /><col className="qr-rcard-c-ins" /><col className="qr-rcard-c-spec" /><col className="qr-rcard-c-flags" /></colgroup>
    : <colgroup><col className="qr-rcard-c-step" /><col className="qr-rcard-c-op" /><col className="qr-rcard-c-ins" /><col className="qr-rcard-c-spec" /><col className="qr-rcard-c-src" /><col className="qr-rcard-c-flags" /></colgroup>;
  const heads = hideSrc
    ? [t('rc.step'), t('rc.operation'), t('rc.instructions'), t('rc.specs'), { label: t('rc.flags'), className: 'qr-rc-flags' }]
    : [t('rc.step'), t('rc.operation'), t('rc.instructions'), t('rc.specs'), t('rc.src'), { label: t('rc.flags'), className: 'qr-rc-flags' }];
  return <div className="qr-route-card" data-testid="route-card">
    <div className="head">
      <div><b>{t('rc.part')}</b><span className="qr-ltr">{part.partNo}</span></div><div><b>{t('rc.rev')}</b>{part.rev || '-'}</div><div><b>{t('rc.customer')}</b>{part.customer}</div><div><b>{t('rc.material')}</b><span>{L(part.material, 'normalized') || '—'}</span></div>
      <div style={{ gridColumn: 'span 2' }}><b>{t('rc.title')}</b>{part.title}</div><div><b>{t('rc.source')}</b>{L(part, 'routeSource')}</div><div><b>{t('rc.status')}</b><PlainStatusBadge part={part} /> · {t('rc.readOnly')}</div>
    </div>
    <MrtTable className="qr-rcard-tab" data-same-src={hideSrc ? '1' : undefined} cols={cols}>
      <MrtHead cells={heads} />
      <tbody>{!part.route.length ? <MrtEmpty colSpan={hideSrc ? 5 : 6}>{t('rc.none')}</MrtEmpty> : part.route.map((s: any, i: number) => {
        const op = opLabel(L(s, 'type'), L(s, 'title')); const specs = (s.specRefs || []).join(', '); const src = L(s, 'source') || '';
        return <MrtRow key={i} className={s.blocked ? 'qr-rcard-blocked' : undefined}><td>{s.seq}</td><td>{OL(op)}</td>
          <td className="qr-mrt-wrap">{s.items.map((it: any, j: number) => { const line = (it.seq && it.seq !== s.seq ? it.seq + ' ' : '') + (L(it, 'text') || ''); return <span key={j}>{OL(line, <>{it.seq && it.seq !== s.seq ? <span>{it.seq} </span> : null}<bdi>{L(it, 'text')}</bdi></>)}</span>; })}</td>
          <td>{OL(specs)}</td>{hideSrc ? null : <td>{OL(src)}</td>}
          <td className="qr-rc-flags">{s.outsourced && <Chip t="info" testid="rc-outsourced">{t('rc.outsourced')}</Chip>} {s.blocked && <Chip t="danger">{t('rc.waiting')}</Chip>}{s.moved && <Chip t="attention">{t('rc.moved')}</Chip>}</td></MrtRow>;
      })}</tbody>
    </MrtTable>
  </div>;
}
