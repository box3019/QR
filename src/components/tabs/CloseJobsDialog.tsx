// Save / Do not save / Cancel when closing job tabs that have unsaved changes (or a running job).
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import type { CloseAsk } from '../../projects/useProjects';

export function CloseJobsDialog({ ask, onPick }: { ask: CloseAsk; onPick: (c: 'save' | 'discard' | 'cancel') => void }) {
  const title = ask.mode === 'all' ? t('tab.closeAllTitle') : ask.mode === 'others' ? t('tab.closeOthersTitle') : t('tab.closeTitle');
  const names = ask.unsaved.map((j) => [j.label || t('tab.new'), j.customer].filter(Boolean).join(' '));
  return <div className="qr-modal-back" data-testid="close-jobs-dialog" role="dialog" aria-modal="true" aria-labelledby="close-jobs-title">
    <div className="qr-modal">
      <div className="qr-panel-h" id="close-jobs-title">{title}</div>
      <p className="qr-close-ask">{ask.unsaved.length ? (ask.mode === 'one' ? t('tab.closeUnsaved') : t('tab.closeAllUnsaved')) : t('tab.closeBusy')}</p>
      {!!names.length && <ul className="qr-close-jobs" data-testid="close-unsaved-list">{names.map((n, i) => <li key={ask.unsaved[i].id}><bdi>{n}</bdi></li>)}</ul>}
      {ask.busy && ask.unsaved.length > 0 && <p className="qr-close-ask">{t('tab.closeBusyList')}</p>}
      <div className="qr-row qr-close-ask-btns">
        <button type="button" className={MRT_BTN} data-testid="close-cancel" title={t('tip.cancel')} onClick={() => onPick('cancel')}>{t('st.cancel')}</button>
        <button type="button" className={MRT_BTN} data-testid="close-discard" title={t('tab.discard')} onClick={() => onPick('discard')}>{t('tab.discard')}</button>
        <button type="button" className={MRT_BTN_PRIMARY} data-testid="close-save" title={t('top.save')} onClick={() => onPick('save')}>{t('top.save')}</button>
      </div>
    </div>
  </div>;
}
