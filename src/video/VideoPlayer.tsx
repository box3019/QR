// In-app tutorial video player: play/pause, seek, chapters list, subtitles toggle. Subtitles come from a WebVTT text
// returned over IPC and drawn as an overlay (a <track> cannot load from a file:// page: its Blob URL has an opaque origin).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MRT_ACTION_BTN, MRT_ACTION_BTN_PRIMARY } from '../ui/mrtButtons';
import { chapterAt, fmtTime, parseVtt } from './manifest.mjs';
import { t } from '../i18n';

export type VideoData = { lang: string; src: string; vtt: string; duration: number; title: string; dir: 'rtl' | 'ltr'; chapters: { t: number; title: string }[] };

const cache = new Map<string, Promise<VideoData | null>>();
/** The bundled video for a language (cached), or null when there is none. */
export function loadVideo(lang: string): Promise<VideoData | null> {
  if (!cache.has(lang)) {
    const q = (window as any).qr;
    cache.set(lang, Promise.resolve(q?.tutorialVideo ? q.tutorialVideo(lang) : null).then((v: VideoData | null) => v || null).catch(() => null));
  }
  return cache.get(lang)!;
}

export default function VideoPlayer({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [data, setData] = useState<VideoData | null | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [subs, setSubs] = useState(true);
  const [err, setErr] = useState(false);
  const vref = useRef<HTMLVideoElement>(null);
  useEffect(() => { let on = true; loadVideo(lang).then((v) => { if (on) setData(v); }); return () => { on = false; }; }, [lang]);
  const cues = useMemo(() => { try { return data ? parseVtt(data.vtt) : []; } catch { return []; } }, [data]);
  const seek = (s: number) => { const v = vref.current; if (!v) return; v.currentTime = Math.max(0, Math.min(s, v.duration || s)); setCur(v.currentTime); };
  const toggle = () => { const v = vref.current; if (!v) return; if (v.paused) void v.play().catch(() => setErr(true)); else v.pause(); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.stopPropagation(); const v = vref.current; if (v) seek(v.currentTime + (e.key === 'ArrowRight' ? 5 : -5)); }
    };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  }, []);
  const idx = data ? chapterAt(data.chapters, cur) : 0;
  const total = dur || data?.duration || 0;
  const cue = subs ? cues.find((c) => cur >= c.start && cur < c.end) : undefined;
  return <div className="qr-vid-bg" data-testid="video-player-bg" onClick={onClose}>
    <div className="qr-vid" role="dialog" aria-label={t('video.title')} data-testid="video-player" onClick={(e) => e.stopPropagation()}>
      <div className="qr-vid-h"><b data-testid="video-title">{data?.title || t('video.title')}</b><span style={{ flex: 1 }} />
        <button type="button" className={MRT_ACTION_BTN} title={t('tip.videoClose')} aria-label={t('tip.videoClose')} data-testid="video-close" onClick={onClose}>{'\u2715'}</button></div>
      {data === undefined && <div className="qr-muted" data-testid="video-loading">{t('video.loading')}</div>}
      {data === null && <div className="qr-muted" data-testid="video-missing">{t('video.missing')}</div>}
      {data && <>
        <div className="qr-vid-stage">
        <video ref={vref} className="qr-vid-el" src={data.src} data-testid="video-el" preload="metadata" onClick={toggle}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setErr(true)}
          onTimeUpdate={(e) => setCur((e.target as HTMLVideoElement).currentTime)} onLoadedMetadata={(e) => setDur((e.target as HTMLVideoElement).duration)} />
        {cue && <div className="qr-vid-sub" dir={data.dir} lang={data.lang} data-testid="video-cue">{cue.text}</div>}
        </div>
        {err && <div className="qr-muted" data-testid="video-error">{t('video.error')}</div>}
        <div className="qr-vid-bar" dir="ltr">
          <button type="button" className={MRT_ACTION_BTN_PRIMARY} data-testid="video-play" data-playing={playing} title={playing ? t('tip.videoPause') : t('tip.videoPlay')} onClick={toggle}>{playing ? t('video.pause') : t('video.play')}</button>
          <input type="range" className="qr-vid-seek" data-testid="video-seek" min={0} max={total || 0} step={0.1} value={Math.min(cur, total || 0)} title={t('tip.videoSeek')} aria-label={t('tip.videoSeek')} onChange={(e) => seek(Number(e.target.value))} />
          <span className="qr-vid-time" data-testid="video-time">{fmtTime(cur)} / {fmtTime(total)}</span>
          <button type="button" className={MRT_ACTION_BTN} data-testid="video-subs" aria-pressed={subs} title={t('tip.videoSubs')} onClick={() => setSubs(!subs)}>{t('video.subs')}</button>
        </div>
        <ol className="qr-vid-chapters" dir={data.dir} data-testid="video-chapters" aria-label={t('video.chapters')}>
          {data.chapters.map((c, n) => <li key={n}><button type="button" className={MRT_ACTION_BTN} data-testid="video-chapter" data-active={n === idx} title={t('tip.videoChapter')} onClick={() => { seek(c.t); const v = vref.current; if (v && v.paused) void v.play().catch(() => {}); }}>
            <span className="qr-vid-ct" dir="ltr">{fmtTime(c.t)}</span> {c.title}</button></li>)}
        </ol>
      </>}
    </div></div>;
}