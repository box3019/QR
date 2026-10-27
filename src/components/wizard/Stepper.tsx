// Vertical wizard rail on the start side (MRT stepper look, QR's own copy): numbered badges, done/current/locked, captions.
import React from 'react';
import { t } from '../../i18n';
import { STEPS, stepState, canOpen } from '../../wizard/steps.mjs';

export function Stepper({ step, setStep, hasParts, captions }: { step: number; setStep: (n: number) => void; hasParts: boolean; captions?: Record<number, { text: string; tone?: string }> }) {
  return <nav className="qr-rail" data-testid="stepbar" aria-label={t('wz.aria')}>
    <ol className="mrt-wizard-steps">
      {STEPS.map((n) => { const st = stepState(n, step); const open = canOpen(n, hasParts); const c = captions?.[n];
        return <li key={n} className="mrt-wizard-step-item">
          <button type="button" className="mrt-wizard-step" data-state={st === 'todo' ? (open ? 'todo' : 'locked') : st} data-step={n} data-testid={'step-' + n}
            aria-current={st === 'current' ? 'step' : undefined} disabled={!open} title={t('wz.tipStep')} onClick={() => setStep(n)}>
            <span className="mrt-wizard-step-marker" aria-hidden>{st === 'done' ? '✓' : n}</span>
            <span className="mrt-wizard-step-text"><span className="mrt-wizard-step-label">{t('wz.s' + n)}</span>
              <span className="mrt-wizard-step-caption" data-tone={c?.tone}>{c?.text || t('wz.c' + n)}</span></span>
          </button></li>; })}
    </ol>
  </nav>;
}
