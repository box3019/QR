// Main-area header of a step: title, then the assistant avatar and its hint bubble (MRT wizard main header).
import React from 'react';
import { t } from '../../i18n';
import { AssistantHint } from './AssistantHint';
import { Ico } from '../Ico';
import { NextStep } from './NextStep';

export function StepHeader({ step, hint, assistant, next, onGo }: any) {
  return <header className="qr-wiz-head" data-testid="step-hint">
    <h2 className="qr-wiz-title">{t('wz.s' + step)}</h2>
    <button type="button" className="qr-step-help" data-testid="btn-step-help" title={t('tip.stepHelp')} aria-label={t('tip.stepHelp')} onClick={() => window.dispatchEvent(new CustomEvent('qr:tour', { detail: { stage: step } }))}><Ico name="help" size={16} /></button>
    <AssistantHint hint={hint} on={assistant.on} toggle={assistant.toggle} />
    <NextStep next={next} onGo={onGo} />
  </header>;
}
