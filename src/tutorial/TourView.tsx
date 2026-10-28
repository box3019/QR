// Guided tour in the MRT look: dimmed screen with a spotlight on the real element, a short light card,
// Back / Next / Skip and step dots. Works with nothing loaded: a small demo picture stands in for missing parts.
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { MRT_ACTION_BTN, MRT_ACTION_BTN_PRIMARY } from '../ui/mrtButtons';
import { TOUR_TEXT, tourFor, tourLang } from './tour.mjs';
import { useFloat } from '../ui/useFloat';

type R = { x: number; y: number; w: number; h: number } | null;
const find = (id: string): HTMLElement | null => (Array.from(document.querySelectorAll(`[data-testid="${id}"]`)) as HTMLElement[]).find((e) => e.offsetParent && e.getBoundingClientRect().width > 0) || null;

function Demo({ kind, d }: { kind: string | null; d: Record<string, string> }) {
  if (!kind) return null;
  const chip = (txt: string, tone: string) => <span className={'qr-tour-chip qr-tour-' + tone}>{txt}</span>;
  const body: Record<string, React.ReactNode> = {
    outlook: <div className="qr-tour-ribbon"><span className="qr-tour-rbtn">QR</span><span>{d.send}</span></div>,
    drop: <div className="qr-tour-drop">{d.drop}</div>,
    import: <div><div className="qr-tour-bar"><i style={{ width: '62%' }} /></div><div className="qr-tour-small">{d.importing}</div></div>,
    groups: <div className="qr-tour-col">{chip(d.ours + ' · 3', 'ok')}{chip(d.check + ' · 1', 'warn')}{chip(d.notOurs + ' · 1', 'bad')}</div>,
    drawing: <div className="qr-tour-sheet"><svg viewBox="0 0 120 60" width="120" height="60"><rect x="4" y="4" width="112" height="52" fill="none" stroke="#94a3b8" /><circle cx="40" cy="30" r="14" fill="none" stroke="#475569" /><rect x="66" y="18" width="36" height="24" fill="none" stroke="#475569" /></svg></div>,
    card: <div className="qr-tour-col"><span className="qr-tour-line" /><span className="qr-tour-line s" /><span className="qr-tour-line" /></div>,
    actions: <div className="qr-tour-row">{chip(d.confirm, 'ok')}{chip(d.ask, 'warn')}{chip(d.upload, 'info')}</div>,
    docs: <div className="qr-tour-row">{chip(d.upload, 'info')}{chip(d.q, 'warn')}</div>,
    exports: <div className="qr-tour-row">{chip(d.q, 'info')}{chip(d.x, 'info')}{chip(d.pdf, 'info')}</div>,
    tabs: <div className="qr-tour-row">{chip(d.tab + ' 1', 'info')}{chip(d.tab + ' 2', 'info')}<span className="qr-tour-chip">+</span></div>,
  };
  return <div className="qr-tour-demo" data-testid="tour-demo" aria-hidden>{body[kind]}</div>;
}

export function Tour({ lang0, stage, onClose, first }: { lang0: string; stage?: number; onClose: () => void; first?: boolean }) {
  const lang = tourLang(lang0); // the single language comes from Settings (no selector here)
  const steps = tourFor(stage); const [i, setI] = useState(0); const [r, setR] = useState<R>(null); const [real, setReal] = useState(false);
  const f = useFloat(first ? 'tour:first' : 'tour');
  const T = TOUR_TEXT[lang]; const s = steps[i]; const last = i === steps.length - 1; const [h, p] = T.s[s.id];
  useEffect(() => { const w = window as any; if (s.stage && w.__qrStep && (w.__qrParts || []).length) w.__qrStep(s.stage); }, [i]);
  useLayoutEffect(() => {
    const upd = () => { const e = find(s.target) || (s.stage ? find('step-' + s.stage) : null); setReal(!!find(s.target));
      if (!e) return setR(null); const b = e.getBoundingClientRect(); setR({ x: b.left - 4, y: b.top - 4, w: b.width + 8, h: b.height + 8 }); };
    upd(); const t = setInterval(upd, 250); window.addEventListener('resize', upd); return () => { clearInterval(t); window.removeEventListener('resize', upd); };
  }, [i, s.target]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const fwd = (e.key === 'ArrowRight') !== (T.dir === 'rtl'); setI((n) => Math.max(0, Math.min(steps.length - 1, n + (fwd ? 1 : -1)))); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [lang, steps.length]);
  const vw = window.innerWidth, vh = window.innerHeight, cw = 340;
  const pos: React.CSSProperties = !r ? { left: (vw - cw) / 2, top: vh / 3 } : (() => {
    const below = r.y + r.h + 12, top = below + 220 < vh ? below : Math.max(12, r.y - 232);
    const left = Math.max(12, Math.min(vw - cw - 12, r.x + r.w / 2 - cw / 2)); return { left, top: Math.min(top, vh - 232) };
  })();
  return <div className="qr-tour" data-testid={first ? 'first-run' : 'tutorial'} data-step={s.id} data-real={real}>
    {r ? <div className="qr-tour-hole" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} /> : <div className="qr-tour-dim" />}
    <div className="qr-tour-card" dir={T.dir} lang={lang} ref={f.ref} style={{ ...pos, ...f.style, width: cw }} data-testid="tutorial-card" role="dialog" aria-label={h}>
      <div className="qr-tour-head" title={T.ui.tipDrag} data-testid="tutorial-head" {...f.headProps}><b data-testid="tutorial-title">{h}</b></div>
      <p className="qr-tour-p">{p}</p>
      {!real && <Demo kind={s.demo} d={T.demo} />}
      <div className="qr-tour-dots" data-testid="tutorial-step">{steps.map((x, n) => <button type="button" key={x.id} className="qr-tour-dot" data-on={n === i} title={`${T.ui.tipDot} ${n + 1} ${T.ui.of} ${steps.length}`} aria-label={`${n + 1} ${T.ui.of} ${steps.length}`} onClick={() => setI(n)} />)}</div>
      <div className="qr-tour-f">
        <button type="button" className={MRT_ACTION_BTN} title={T.ui.tipSkip} data-testid={first ? 'first-run-ok' : 'tutorial-skip'} onClick={onClose}>{T.ui.skip}</button>
        <span style={{ flex: 1 }} />
        <button type="button" className={MRT_ACTION_BTN} title={T.ui.tipBack} disabled={i === 0} data-testid="tutorial-prev" onClick={() => setI(i - 1)}>{T.ui.back}</button>
        <button type="button" className={MRT_ACTION_BTN_PRIMARY} title={last ? T.ui.tipSkip : T.ui.tipNext} data-testid="tutorial-next" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? T.ui.done : T.ui.next}</button>
      </div></div></div>;
}
