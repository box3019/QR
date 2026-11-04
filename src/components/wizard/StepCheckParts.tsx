// Step 2, one focus at a time: the list of parts, or ONE part (task pane on the start side, drawing on the other).
import React from 'react';
import { t } from '../../i18n';
import { viewerTabs } from '../../wizard/steps.mjs';
import { TriageView } from './TriageView';
import { DrawingView, RouteCard, ModelView, DataView } from '../../views/Viewer';
import { PartCard } from '../partcard/PartCard';
import { PartNav } from './PartNav';

export function StepCheckParts({ parts, sel, open, onOpen, onBack, onGo, onLeave, rtl, unknown, details, tab, setTab, focus, setFocus, setStep, onPatch, onPrint, onSave, onPrintPack, onSavePack, onSaveEach }: any) {
  const part = parts[sel];
  if (!open || !part) return <div className="qr-body qr-onefocus" data-testid="step2-list"><TriageView parts={parts} sel={sel} onOpen={onOpen} onPatch={onPatch} onPrint={onPrint} onSave={onSave} onPrintPack={onPrintPack} onSavePack={onSavePack} onSaveEach={onSaveEach} /></div>;
  const tabs = viewerTabs(details); const cur = tabs.includes(tab) ? tab : 'drawing';
  const loc = (f: any) => { setTab('drawing'); setFocus((cur: any) => {
    if (!f) return null;
    if (cur && cur.id === f.id && (f.boxes || []).length > 1) {
      const n = ((cur.boxIndex || 0) + 1) % f.boxes.length;
      const b = f.boxes[n];
      return { ...f, boxIndex: n, page: b.page || f.page, bbox: b };
    }
    return { ...f, boxIndex: 0, page: (f.boxes && f.boxes[0] && f.boxes[0].page) || f.page, bbox: (f.boxes && f.boxes[0]) || f.bbox };
  }); };
  return <div className="qr-body qr-onefocus qr-pview" data-testid="step2-part">
    <PartNav parts={parts} sel={sel} step={2} onBack={onBack} onGo={onGo} onLeave={onLeave} rtl={rtl} />
    <div className="qr-pview-cols" data-locate={focus ? '1' : undefined}>
      <PartCard part={part} n={parts.length} sel={sel} setSel={onGo} details={details} goStep={setStep} focus={focus} onFocus={loc}
        onPatch={(next: any) => onPatch(sel, next)} onPrint={() => onPrint(sel)} onSave={() => onSave(sel)} />
      <div className="qr-panel" data-testid="drawing-panel">
        {details && <div className="qr-tabs">{tabs.map((k: string) => <button key={k} className="qr-tab" data-active={cur === k} data-testid={'tab-' + k} title={t('tip.tab')} onClick={() => setTab(k)}>{t('tab.' + k)}</button>)}</div>}
        <div className="qr-scroll">
          {cur === 'drawing' && <DrawingView part={part} focus={focus} details={details} onFocus={setFocus} onSelect={(id: string) => setFocus((f: any) => (f && f.id === id ? f : { ...f, id }))} />}
          {cur === 'route' && <RouteCard part={part} />}
          {cur === 'model' && <ModelView part={part} />}
          {cur === 'data' && <DataView part={part} />}
        </div>
      </div>
    </div>
  </div>;
}
