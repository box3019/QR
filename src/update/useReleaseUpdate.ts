import { useEffect, useRef, useState } from 'react';

const qr = () => (window as any).qr;

export function useReleaseUpdate(settings: any, notify: (n: any) => void) {
  const [avail, setAvail] = useState(null as null | { latestVersion: string; mandatory?: boolean; releaseNotes?: string[] });
  const [later, setLater] = useState(false);
  const [busy, setBusy] = useState(null as null | { version: string; notes: string[]; frac: number | null; phase: string });
  const settingsRef = useRef(settings); settingsRef.current = settings;

  const check = async (manual?: boolean) => {
    const s = settingsRef.current; if (!s) return;
    try {
      const r = await qr().releaseUpdate?.('check', { feedFolder: s.updateFeedFolder });
      if (!r || !r.ok) { if (manual) notify(r && r.code ? { code: r.code } : { code: 'updFailed', vars: { text: (r && r.error) || '' } }); return; }
      if (r.update) { setAvail(r.update); setLater(false); }
      else { setAvail(null); if (manual) notify({ code: 'updNone' }); }
    } catch (e: any) { if (manual) notify({ code: 'updFailed', vars: { text: e?.message || e } }); }
  };

  useEffect(() => { if (!settings) return; if (settings.updateCheckOnStartup === false) return;
    const t = setTimeout(() => check(false), 4000);
    const ms = settings.updateCheckInterval === 'hourly' ? 3600 * 1000 : 24 * 3600 * 1000;
    const i = setInterval(() => check(false), ms);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [settings && settings.updateCheckOnStartup, settings && settings.updateCheckInterval, settings && settings.updateFeedFolder]);

  useEffect(() => qr().onReleaseUpdate ? qr().onReleaseUpdate((ev: any) => {
    if (!ev || ev.type !== 'progress') return;
    setBusy((b) => b ? { ...b, frac: ev.total ? ev.copied / ev.total : b.frac, phase: ev.phase || b.phase } : b);
  }) : undefined, []);

  const install = async () => {
    const s = settingsRef.current; const u = avail; if (!u) return;
    setBusy({ version: u.latestVersion, notes: u.releaseNotes || [], frac: 0, phase: 'copy' });
    try {
      const r = await qr().releaseUpdate?.('install-update', { feedFolder: s.updateFeedFolder });
      if (!r || !r.ok) { setBusy(null); if (!r || !r.cancelled) notify(r && r.code ? { code: r.code } : { code: 'updFailed', vars: { text: (r && r.error) || '' } }); }
      else setBusy((b) => b ? { ...b, phase: 'start', frac: 1 } : b);
    } catch (e: any) { setBusy(null); notify({ code: 'updFailed', vars: { text: e?.message || e } }); }
  };
  const cancel = () => { qr().releaseUpdate?.('cancel'); setBusy(null); };

  return { avail: later && !(avail && avail.mandatory) ? null : avail, busy, check, install, later: () => setLater(true), cancel };
}
