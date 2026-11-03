// Step 1 with nothing loaded: the last 5 projects, small, under the drop zone. One click reopens it.
import React from 'react';
import { t } from '../../i18n';
import { when } from './when';
import { MrtTable, MrtHead, MrtRow } from '../../ui/MrtTable';

export function RecentList({ items, onOpen }: any) {
  return <div className="qr-recent" data-testid="recent">
    <div className="qr-recent-h">{t('hist.recent')}</div>
    <MrtTable className="qr-recent-tab">
      <MrtHead cells={[t('ck.col.item'), t('hist.customer'), t('wz.parts'), t('hist.opened')]} />
      <tbody>{items.map((e: any) => <MrtRow key={e.id} className="qr-recent-row" data-testid="recent-row" data-id={e.id} title={t('hist.tipOpen')} onClick={() => onOpen(e.id)}>
        <td><button type="button" className="qr-hist-open" title={t('hist.tipOpen')}><bdi className="qr-recent-l">{e.label || t('tab.new')}</bdi></button></td>
        <td>{e.customer ? <bdi className="qr-muted">{e.customer}</bdi> : ''}</td>
        <td className="qr-muted">{t('hist.nParts', { n: e.nParts })}</td>
        <td className="qr-muted">{when(e.opened)}</td>
      </MrtRow>)}</tbody>
    </MrtTable>
  </div>;
}
