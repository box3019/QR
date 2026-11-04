// Small modal confirm. Danger style uses the MRT danger command for the confirm action.
import React from 'react';
import { t } from '../i18n';
import { MRT_BTN, MRT_ACTION_BTN_DANGER } from './mrtButtons';

export function ConfirmDialog({ title, text, confirmLabel, testid, danger, onConfirm, onCancel }: any) {
  return <div className="qr-modal-bg qr-confirm-bg" data-testid={testid} onClick={onCancel}>
    <div className={'qr-modal qr-confirm' + (danger ? ' qr-confirm-danger' : '')} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
      <div className="qr-modal-h">{title}</div>
      <div className="qr-modal-b"><p>{text}</p></div>
      <div className="qr-modal-f">
        <button type="button" className={MRT_BTN} data-testid={testid + '-cancel'} title={t('st.cancel')} onClick={onCancel}>{t('st.cancel')}</button>
        <button type="button" className={danger ? MRT_ACTION_BTN_DANGER : MRT_BTN} data-testid={testid + '-ok'} title={confirmLabel} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>;
}
