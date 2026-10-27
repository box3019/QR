// Wizard footer bar, bottom end: Cancel (new RFQ), Next, Close (MRT wizard footer look).
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN } from '../../ui/mrtButtons';
import { canOpen, nextStep } from '../../wizard/steps.mjs';

export function WizardFooter({ step, setStep, hasParts, onCancel, onClose }: any) {
  const nextOk = step < 4 && canOpen(nextStep(step), hasParts);
  return <footer className="qr-wiz-footer" data-testid="wiz-footer">
    <button type="button" className={MRT_BTN} data-testid="btn-cancel" title={t('tip.wzCancel')} disabled={!hasParts} onClick={onCancel}>{t('wz.cancel')}</button>
    <button type="button" className={MRT_BTN} data-testid="btn-next" title={t('wz.tipNext')} disabled={!nextOk} onClick={() => setStep(nextStep(step))}>{t('wz.next')} <span aria-hidden className="qr-chev">›</span></button>
    <button type="button" className={MRT_BTN} data-testid="btn-close" title={t('tip.wzClose')} onClick={onClose}>{t('wz.close')}</button>
  </footer>;
}
