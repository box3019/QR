// Busy state of a run, fed by pipeline events (logic in wizard/progress.mjs). onPart receives each analysed part.
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { reduceBusy, startBusy, Busy } from '../wizard/progress.mjs';

export function useBusy(onPart: (p: any) => void) {
  const [busy, setBusy] = useState<Busy | null>(null);
  useEffect(() => (window as any).qr.onEvent((ev: any) => { setBusy((b) => reduceBusy(b, ev, t)); if (ev.type === 'part') onPart(ev.part); }), []);
  return { busy, start: () => setBusy(startBusy()), stop: () => setBusy(null) };
}
