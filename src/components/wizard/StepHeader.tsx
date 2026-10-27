// Main-area header of a step: title, one-line hint and the Next button (MRT wizard main header look).
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { canOpen, nextStep } from '../../wizard/steps.mjs';

export function StepHeader({ step, setStep, hasParts, hint }: any) {
  const nextOk = step < 4 && canOpen(nextStep(step), hasParts);
  return <header className="qr-wiz-head" data-testid="step-hint">
    <h2 className="qr-wiz-title">{t('wz.s' + step)}</h2>
    <span className="qr-stephint-text">{hint}</span>
    {nextOk && <button type="button" className={MRT_BTN_PRIMARY + ' qr-next'} data-testid="btn-next" title={t('wz.tipNext')} onClick={() => setStep(nextStep(step))}>{t('wz.next')}</button>}
  </header>;
}
