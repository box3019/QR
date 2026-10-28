import { useEffect, useState } from 'react';
let cached: string | null = null;
/** The app version from the main process (app.getVersion()), '' until it arrives. */
export function useVersion(): string {
  const [v, setV] = useState(cached || '');
  useEffect(() => { if (cached) return; const q = (window as any).qr; q?.getVersion?.().then((x: string) => { cached = x; setV(x); }).catch(() => {}); }, []);
  return v;
}
