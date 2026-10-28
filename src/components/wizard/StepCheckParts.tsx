// Step 2, one focus at a time: the list of parts, or ONE part (large drawing beside that part's blocks). No third column.
import React from 'react';
import { t } from '../../i18n';
import { viewerTabs } from '../../wizard/steps.mjs';
import { PartsList } from '../../views/Parts';
import { DrawingView, RouteCard, ModelView, DataView } from '../../views/Viewer';
import { PartCard } from '../partcard/PartCard';
import { PartNav } from './PartNav';

export function StepCheckParts({ parts, sel, open, onOpen, onBack, onGo, onLeave, rtl, unknown, details, tab, setTab, focus, setFocus, setStep }: any) {
  const part = parts[sel];
  if (!open || !part) return <div className="qr-body qr-onefocus" data-testid="step2-list"><PartsList parts={parts} sel={sel} onOpen={onOpen} unknown={unknown} details={details} /></div>;
  const tabs = viewerTabs(details); const cur = tabs.includes(tab) ? tab : 'drawing';
  return <div className="qr-body qr-onefocus qr-pview" data-testid="step2-part">
    <PartNav parts={parts} sel={sel} step={2} onBack={onBack} onGo={onGo} onLeave={onLeave} rtl={rtl} />
    <div className="qr-pview-cols">
      <div className="qr-panel">
        <div className="qr-tabs">{tabs.map((k: string) => <button key={k} className="qr-tab" data-active={cur === k} data-testid={'tab-' + k} title={t('tip.tab')} onClick={() => setTab(k)}>{t('tab.' + k)}</button>)}</div>
        <div className="qr-scroll">
          {cur === 'drawing' && <DrawingView part={part} focus={focus} details={details} />}
          {cur === 'route' && <RouteCard part={part} />}
          {cur === 'model' && <ModelView part={part} />}
          {cur === 'data' && <DataView part={part} />}
        </div>
      </div>
      <PartCard part={part} n={parts.length} sel={sel} setSel={onGo} details={details} goStep={setStep} onFocus={(f: any) => { setTab('drawing'); setFocus(f); }} />
    </div>
  </div>;
}
