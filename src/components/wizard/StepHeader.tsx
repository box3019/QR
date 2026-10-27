// Main-area header of a step: title, then the assistant avatar and its hint bubble (MRT wizard main header).
import React from 'react';
import { t } from '../../i18n';
import { AssistantHint } from './AssistantHint';

export function StepHeader({ step, hint, assistant }: any) {
  return <header className="qr-wiz-head" data-testid="step-hint">
    <h2 className="qr-wiz-title">{t('wz.s' + step)}</h2>
    <AssistantHint hint={hint} on={assistant.on} toggle={assistant.toggle} />
  </header>;
}
