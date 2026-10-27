// Numbered step bar (MRT wizard look, QR's own copy) + one-line hint + Next.
import React from 'react';
import { t } from '../i18n';
import { MRT_BTN_PRIMARY } from '../ui/mrtButtons';
import { STEPS, stepState, canOpen, nextStep } from './steps.mjs';

export function StepBar({ step, setStep, hasParts, hint }: { step: number; setStep: (n: number) => void; hasParts: boolean; hint: string }) {
  const nextOk = step < 4 && canOpen(nextStep(step), hasParts);
  return <div className="qr-stepbar" data-testid="stepbar">
    <ol className="mrt-wizard-steps" aria-label={t('wz.aria')}>
      {STEPS.map((n) => { const st = stepState(n, step); const open = canOpen(n, hasParts);
        return <li key={n} className="mrt-wizard-step-item">
          <button type="button" className="mrt-wizard-step" data-state={st === 'todo' ? (open ? 'todo' : 'locked') : st} data-step={n} data-testid={'step-' + n}
            aria-current={st === 'current' ? 'step' : undefined} disabled={!open} title={t('wz.tipStep')} onClick={() => setStep(n)}>
            <span className="mrt-wizard-step-marker" aria-hidden>{st === 'done' ? '✓' : n}</span>
            <span className="mrt-wizard-step-text"><span className="mrt-wizard-step-label">{t('wz.s' + n)}</span><span className="mrt-wizard-step-caption">{t('wz.c' + n)}</span></span>
          </button></li>; })}
    </ol>
    <div className="qr-stephint" data-testid="step-hint">
      <span className="qr-stephint-text">{hint}</span>
      {nextOk && <button type="button" className={MRT_BTN_PRIMARY + ' qr-next'} data-testid="btn-next" title={t('wz.tipNext')} onClick={() => setStep(nextStep(step))}>{t('wz.next')}</button>}
    </div>
  </div>;
}

/** Boxed section with a clear title (MRT wizard panel look). */
export function Box({ title, children, testid, actions }: any) {
  return <section className="mrt-wizard-panel qr-box" data-testid={testid}>
    <div className="qr-box-h"><h3 className="qr-box-title">{title}</h3>{actions}</div>
    <div className="qr-box-b">{children}</div>
  </section>;
}
