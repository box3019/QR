// Wizard rail on the start side (MRT CMM wizard look, QR's own copy): numbered steps, no sublabels.
import React from 'react';
import { t } from '../../i18n';
import { STEPS, stepState, canOpen } from '../../wizard/steps.mjs';
import { stepWhy } from '../../wizard/nextstep.mjs';

export function Stepper({ step, setStep, hasParts }: { step: number; setStep: (n: number) => void; hasParts: boolean }) {
  return <nav className="qr-rail" data-testid="stepbar" aria-label={t('wz.aria')}>
    <ol className="mrt-wizard-steps">
      {STEPS.map((n) => { const st = stepState(n, step); const open = canOpen(n, hasParts);
        return <li key={n} className="mrt-wizard-step-item">
          <button type="button" className="mrt-wizard-step" data-state={st === 'todo' ? (open ? 'todo' : 'locked') : st} data-step={n} data-testid={'step-' + n}
            aria-current={st === 'current' ? 'step' : undefined} disabled={!open} title={open ? t('wz.tipStep') : t(stepWhy(n, hasParts) || 'wz.tipStep')} onClick={() => setStep(n)}>
            <span className="mrt-wizard-step-marker" aria-hidden>{st === 'done' ? '✓' : n}</span>
            <span className="mrt-wizard-step-text"><span className="mrt-wizard-step-label">{t('wz.s' + n)}</span></span>
          </button></li>; })}
    </ol>
  </nav>;
}
