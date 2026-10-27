// Busy state of a run and the import view, both fed by pipeline events (logic in wizard/progress.mjs, wizard/importView.mjs).
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { reduceBusy, startBusy, Busy } from '../wizard/progress.mjs';
import { reduceImport, startImport, finishImport, ImportState } from '../wizard/importView.mjs';

export function useBusy(onPart: (p: any) => void) {
  const [busy, setBusy] = useState<Busy | null>(null);
  const [view, setView] = useState<ImportState | null>(null);
  useEffect(() => (window as any).qr.onEvent((ev: any) => { setBusy((b) => reduceBusy(b, ev, t)); setView((v) => reduceImport(v, ev)); if (ev.type === 'part') onPart(ev.part); }), []);
  return { busy, view, start: (append = false) => { setBusy(startBusy()); setView((v) => startImport(v, append)); }, stop: () => { setBusy(null); setView((v) => finishImport(v)); }, clear: () => setView(null) };
}
