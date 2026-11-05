// MRT left rail (v9.0.60 LeftPanel): caption, large job/part number, divider, framed thumbnail,
// then stacked sections (job table, critical count, operation stack) and full-width actions.
// No PIN / ERP / user footer. RTL places this column on the right via the page dir.
import React, { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN_EMPHASIS } from '../../ui/mrtButtons';
import { criticalCount, drawingOf, jobLabel } from '../../wizard/rail.mjs';
import { RailContext } from './RailContext';
import { Stepper } from './Stepper';

const qr = () => (window as any).qr;

function RailThumb({ drawing }: { drawing: any }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const path = drawing && drawing.path;
    if (!path) { setSrc(''); return; }
    let live = true;
    const page = (drawing.pages && drawing.pages[0] && drawing.pages[0].n) || 1;
    Promise.resolve(qr().preview?.(path, page, 400)).then((r: any) => { if (live) setSrc((r && r.png) || ''); }).catch(() => { if (live) setSrc(''); });
    return () => { live = false; };
  }, [drawing && drawing.path]);
  return <div className="mrt-asset-card mrt-asset-card--rail-thumbnail qr-rail-thumb" data-testid="rail-thumb">
    {src ? <img src={src} alt={t('rail.thumb')} className="mrt-asset-card__image" draggable={false} /> : <span className="qr-rail-thumb-ph" data-testid="rail-thumb-empty">{t('rail.noThumb')}</span>}
  </div>;
}

export function WizardRail({ step, setStep, hasParts, rfqs, parts, files, sel, settings, onOpenDrawing, onOpenChecklist }: any) {
  const label = jobLabel({ rfqs, parts });
  const crit = criticalCount(parts, settings);
  const drawing = drawingOf(parts, sel);
  return <aside className="qr-rail mrt-workspace-left-rail mrt-workspace-left-chrome" data-testid="wizard-rail">
    <div className="qr-rail-head">
      <span className="qr-rail-caption">{t('rail.caption')}</span>
      <span className="qr-rail-number" data-testid="rail-number" title={label}>{label || '\u00A0'}</span>
      <div className="qr-rail-rule" aria-hidden />
      <RailThumb drawing={drawing} />
    </div>
    <RailContext rfqs={rfqs} parts={parts} files={files} />
    <section className="qr-rail-sec qr-rail-critical" data-testid="rail-critical">
      <div className="qr-rail-sec-h">{t('rail.critical')}</div>
      <div className="qr-rail-critical-card">
        <div className="qr-rail-count" data-testid="rail-critical-count">{crit}</div>
        <button type="button" className={MRT_BTN_EMPHASIS + ' qr-rail-btn'} data-testid="rail-open-checklist" disabled={!hasParts} title={t('rail.openChecklist')} onClick={onOpenChecklist}>{t('rail.openChecklist')}</button>
      </div>
    </section>
    <section className="qr-rail-sec qr-rail-stack" data-testid="rail-stack">
      <div className="qr-rail-sec-h">{t('rail.stack')}</div>
      <Stepper step={step} setStep={setStep} hasParts={hasParts} />
    </section>
    <div className="qr-rail-actions">
      <button type="button" className={MRT_BTN_EMPHASIS + ' qr-rail-btn'} data-testid="rail-open-drawing" disabled={!hasParts} title={t('tip.openDrawing')} onClick={onOpenDrawing}>{t('pl.openDrawing')}</button>
    </div>
  </aside>;
}
