// Busy state of one project's run and its import view, fed by that project's pipeline events (logic in wizard/progress.mjs, wizard/importView.mjs).
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { reduceBusy, startBusy, Busy } from '../wizard/progress.mjs';
import { reduceImport, startImport, finishImport, ImportState } from '../wizard/importView.mjs';

/** Events carry the project id (job); other projects' events are ignored, so runs in other tabs do not mix. */
export const forJob = (ev: any, job: string) => !ev || !ev.job || ev.job === job;
export function useBusy(job: string, onPart: (p: any) => void) {
  const [busy, setBusy] = useState<Busy | null>(null);
  const [view, setView] = useState<ImportState | null>(null);
  useEffect(() => (window as any).qr.onEvent((ev: any) => { if (!forJob(ev, job)) return; setBusy((b) => reduceBusy(b, ev, t)); setView((v) => reduceImport(v, ev)); if (ev.type === 'part') onPart(ev.part); }), []);
  return { busy, view, start: (append = false) => { setBusy(startBusy()); setView((v) => startImport(v, append)); }, stop: () => { setBusy(null); setView((v) => finishImport(v)); }, clear: () => setView(null) };
}
