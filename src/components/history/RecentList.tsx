// Step 1 with nothing loaded: the last 5 projects, small, under the drop zone. One click reopens it.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { when } from './when';
import { MRT_BTN } from '../../ui/mrtButtons';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { MrtTable, MrtHead, MrtEmpty, MrtRow } from '../../ui/MrtTable';

export function RecentList({ items, onOpen, onClear }: any) {
  const [ask, setAsk] = useState(false);
  const list = items || [];
  return <div className="qr-recent" data-testid="recent">
    <div className="qr-recent-h">
      <span>{t('hist.recent')}</span>
      {list.length > 0 && <button type="button" className={MRT_BTN} data-testid="recent-clear" title={t('hist.tipClear')} onClick={() => setAsk(true)}>{t('hist.clear')}</button>}
    </div>
    <MrtTable className="qr-recent-tab" cols={<colgroup><col className="qr-mrt-c-text" /><col className="qr-mrt-c-id" /><col className="qr-mrt-c-status" /><col className="qr-mrt-c-id" /></colgroup>}>
      <MrtHead cells={[t('ck.col.item'), t('hist.customer'), t('wz.parts'), t('hist.opened')]} />
      <tbody>{list.length ? list.map((e: any) => <MrtRow key={e.id} className="qr-recent-row" data-testid="recent-row" data-id={e.id} title={t('hist.tipOpen')} onClick={() => onOpen(e.id)}>
        <td><bdi className="qr-recent-l">{e.label || t('tab.new')}</bdi></td>
        <td>{e.customer ? <bdi className="qr-muted">{e.customer}</bdi> : ''}</td>
        <td className="qr-muted">{t('hist.nParts', { n: e.nParts })}</td>
        <td className="qr-muted">{when(e.opened)}</td>
      </MrtRow>) : <MrtEmpty colSpan={4} testid="recent-empty">{t('hist.empty')}</MrtEmpty>}</tbody>
    </MrtTable>
    {ask && <ConfirmDialog danger testid="recent-clear-ask" title={t('hist.clear')} text={t('hist.clearAsk')} confirmLabel={t('hist.clear')} onCancel={() => setAsk(false)} onConfirm={() => { setAsk(false); onClear && onClear(); }} />}
  </div>;
}
