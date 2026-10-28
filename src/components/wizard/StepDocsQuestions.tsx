// Step 3, one focus at a time: the list of parts, or the documents and questions of ONE part.
import React from 'react';
import { PartsList } from '../../views/Parts';
import { ProblemsPanel } from '../../views/Problems';
import { PartNav } from './PartNav';

export function StepDocsQuestions({ parts, sel, open, onOpen, onBack, onGo, onLeave, rtl, unknown, details, updatePart, onFocus }: any) {
  const part = parts[sel];
  if (!open || !part) return <div className="qr-body qr-onefocus" data-testid="step3-list"><PartsList parts={parts} sel={sel} onOpen={onOpen} unknown={unknown} details={details} /></div>;
  return <div className="qr-body qr-onefocus qr-pview" data-testid="step3-part">
    <PartNav parts={parts} sel={sel} step={3} onBack={onBack} onGo={onGo} onLeave={onLeave} rtl={rtl} />
    <div className="qr-pview-cols qr-pview-one"><ProblemsPanel details={details} part={part} onFocus={onFocus} updatePart={updatePart} /></div>
  </div>;
}
