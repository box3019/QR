// "Watch video" button: opens the in-app player for the given language. When no video exists for that language it stays
// visible but marked unavailable, with a tooltip saying why (we never play a video in another language).
import React, { useEffect, useState } from 'react';
import { MRT_ACTION_BTN } from '../ui/mrtButtons';
import VideoPlayer, { loadVideo } from './VideoPlayer';

export default function WatchVideo({ lang, label, tip, noTip, testid = 'watch-video' }: { lang: string; label: string; tip: string; noTip: string; testid?: string }) {
  const [has, setHas] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { let on = true; setHas(null); loadVideo(lang).then((v) => { if (on) setHas(!!v); }); return () => { on = false; }; }, [lang]);
  const off = has === false;
  return <>
    <button type="button" className={MRT_ACTION_BTN} data-testid={testid} data-unavailable={off ? 'true' : undefined} aria-disabled={off || undefined}
      title={off ? noTip : tip} onClick={() => { if (!off) setOpen(true); }}>{label}</button>
    {open && <VideoPlayer lang={lang} onClose={() => setOpen(false)} />}
  </>;
}