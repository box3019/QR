// Step 1 with nothing loaded: the last 5 projects, small, under the drop zone. One click reopens it.
import React from 'react';
import { t } from '../../i18n';
import { when } from './when';

export function RecentList({ items, onOpen }: any) {
  return <div className="qr-recent" data-testid="recent">
    <div className="qr-recent-h">{t('hist.recent')}</div>
    <ul>{items.map((e: any) => <li key={e.id}><button type="button" className="qr-recent-row" data-testid="recent-row" data-id={e.id} title={t('hist.tipOpen')} onClick={() => onOpen(e.id)}>
      <bdi className="qr-recent-l">{e.label || t('tab.new')}</bdi>{e.customer && <bdi className="qr-muted">{e.customer}</bdi>}<span className="qr-muted">{t('hist.nParts', { n: e.nParts })}</span><span className="qr-muted">{when(e.opened)}</span>
    </button></li>)}</ul>
  </div>;
}
