// Step 3: documents to upload and questions for the customer of the selected part.
import React from 'react';
import { PartsPanel } from '../../views/Parts';
import { ProblemsPanel } from '../../views/Problems';

export function StepDocsQuestions({ parts, sel, pick, unknown, details, updatePart, onFocus }: any) {
  const part = parts[sel];
  return <div className="qr-body" data-cols="2">
    <PartsPanel details={details} parts={parts} sel={sel} setSel={pick} unknown={unknown} />
    {part && <ProblemsPanel details={details} part={part} onFocus={onFocus} updatePart={updatePart} />}
  </div>;
}
