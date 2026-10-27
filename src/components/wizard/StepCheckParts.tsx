// Step 2: grouped parts list | drawing (tabs) | part card.
import React from 'react';
import { t } from '../../i18n';
import { viewerTabs } from '../../wizard/steps.mjs';
import { PartsPanel } from '../../views/Parts';
import { DrawingView, RouteCard, ModelView, DataView } from '../../views/Viewer';
import { PartCard } from '../partcard/PartCard';

export function StepCheckParts({ parts, sel, pick, unknown, details, tab, setTab, focus, setFocus, setStep }: any) {
  const part = parts[sel]; const tabs = viewerTabs(details); const cur = tabs.includes(tab) ? tab : 'drawing';
  return <div className="qr-body">
    <PartsPanel details={details} parts={parts} sel={sel} setSel={pick} unknown={unknown} />
    <div className="qr-panel">
      <div className="qr-tabs">{tabs.map((k: string) => <button key={k} className="qr-tab" data-active={cur === k} data-testid={'tab-' + k} title={t('tip.tab')} onClick={() => setTab(k)}>{t('tab.' + k)}</button>)}</div>
      <div className="qr-scroll">
        {part && cur === 'drawing' && <DrawingView part={part} focus={focus} details={details} />}
        {part && cur === 'route' && <RouteCard part={part} />}
        {part && cur === 'model' && <ModelView part={part} />}
        {part && cur === 'data' && <DataView part={part} />}
      </div>
    </div>
    {part && <PartCard part={part} n={parts.length} sel={sel} setSel={pick} details={details} goStep={setStep} onFocus={(f: any) => { setTab('drawing'); setFocus(f); }} />}
  </div>;
}
