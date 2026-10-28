// Wizard footer bar, bottom end: Cancel (new RFQ), Next, Close (MRT wizard footer look).
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { canOpen, nextStep } from '../../wizard/steps.mjs';
import { nextWhy, cancelWhy } from '../../wizard/nextstep.mjs';

export function WizardFooter({ step, partOpen, setStep, hasParts, onCancel, onClose }: any) {
  const nextOk = step < 4 && canOpen(nextStep(step), hasParts); const nw = nextWhy(step, hasParts), cw = cancelWhy(hasParts);
  return <footer className="qr-wiz-footer" data-testid="wiz-footer">
    <button type="button" className={MRT_BTN} data-testid="btn-cancel" title={cw ? t(cw) : t('tip.wzCancel')} disabled={!hasParts} onClick={onCancel}>{t('wz.cancel')}</button>
    <button type="button" className={(step === 2 || step === 3) && !partOpen ? MRT_BTN_PRIMARY : MRT_BTN} data-testid="btn-next" title={nw ? t(nw) : t('wz.tipNext')} disabled={!nextOk} onClick={() => setStep(nextStep(step))}>{t('wz.next')} <span aria-hidden className="qr-chev">›</span></button>
    <button type="button" className={MRT_BTN} data-testid="btn-close" title={t('tip.wzClose')} onClick={onClose}>{t('wz.close')}</button>
  </footer>;
}
