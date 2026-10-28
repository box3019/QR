// Step 2 viewer tabs: drawing (with source highlight), route card, model, data.
import React, { useEffect, useRef, useState } from 'react';
import { MRT_ACTION_BTN } from '../ui/mrtButtons';
import { Chip } from '../ui/common';
import { t, tReadiness, getLang } from '../i18n';
import { zoomStep, fitSheet, centerScroll, panTo } from '../wizard/dropGuard.mjs';

const qr = () => (window as any).qr;
const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');

export function DrawingView({ part, focus, details }: any) {
  const [page, setPage] = useState(focus?.page || 1);
  const [img, setImg] = useState<any>(null);
  const [showOcr, setShowOcr] = useState(true);
  const ocrOn = showOcr && details;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus?.page) setPage(focus.page); }, [focus]);
  useEffect(() => { let live = true; setImg(null); qr().preview(part.drawing.path, page, 2600).then((r: any) => live && setImg(r)); return () => { live = false; }; }, [part.drawing.path, page]);
  const pg = part.drawing.pages.find((p: any) => p.n === page) || part.drawing.pages[0];
  const [zoom, setZoom] = useState(1);
  const [auto, setAuto] = useState(true); // true = the whole sheet is fitted and centred (default); a manual zoom turns it off
  const W = Math.round(1500 * zoom); // displayed width
  const imgRef = useRef<any>(null); imgRef.current = img; const autoRef = useRef(true); autoRef.current = auto;
  const refit = () => { const el = ref.current; const im = imgRef.current; if (!el || !im) return; setZoom(fitSheet(el.clientWidth, el.clientHeight, im.width, im.height)); };
  const recenter = () => { const el = ref.current; if (!el) return; const c = centerScroll(el.clientWidth, el.clientHeight, el.scrollWidth, el.scrollHeight); el.scrollLeft = c.left; el.scrollTop = c.top; };
  // a new part / sheet / image: fit the whole sheet again
  useEffect(() => { setAuto(true); autoRef.current = true; if (img) refit(); }, [img, part.drawing.path, page]);
  // the pane changes size (window resize, panel toggle, details): keep the fit (or the centre when zoomed by hand)
  useEffect(() => { const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return; const ro = new ResizeObserver(() => { if (autoRef.current) refit(); else recenter(); }); ro.observe(el); return () => ro.disconnect(); }, [img]);
  // wheel (and Ctrl+wheel) = zoom; passive:false so the page does not scroll instead
  useEffect(() => { const el = ref.current; if (!el) return; const h = (e: WheelEvent) => { e.preventDefault(); setAuto(false); setZoom((z) => zoomStep(z, e.deltaY)); }; el.addEventListener('wheel', h, { passive: false }); return () => el.removeEventListener('wheel', h); }, [img]);
  // pan: left-drag moves the scroll position only
  const drag = useRef(null as null | { x: number; y: number; left: number; top: number });
  const onDown = (e: React.MouseEvent) => { if (e.button !== 0 || !ref.current) return; e.preventDefault(); drag.current = { x: e.clientX, y: e.clientY, left: ref.current.scrollLeft, top: ref.current.scrollTop }; };
  const onMove = (e: React.MouseEvent) => { const d = drag.current; if (!d || !ref.current) return; const p = panTo(d, e.clientX - d.x, e.clientY - d.y); ref.current.scrollLeft = p.left; ref.current.scrollTop = p.top; };
  const onUp = () => { drag.current = null; };
  // end pan
  const k = img ? W / img.width : 1;
  useEffect(() => { if (img && focus && ref.current) { const el = ref.current.querySelector('[data-kind="focus"]') as HTMLElement; el?.scrollIntoView({ block: 'center', inline: 'center' }); } }, [img, focus]);
  const marks = part.problems.filter((p: any) => p.loc && p.loc.page === page);
  const ocrWords = ocrOn && pg?.ocr ? pg.ocr.words : [];
  return <div className="qr-draw" dir="ltr">
    <div className="qr-row" dir={getLang() === 'he' ? 'rtl' : 'ltr'} style={{ padding: '6px 10px', borderBottom: '1px solid var(--mrt-border-strong)', position: 'sticky', top: 0, background: 'var(--mrt-surface)', zIndex: 2 }}>
      <b className="qr-ltr">{part.drawing.name}</b>
      {part.drawing.pages.map((p: any) => <button key={p.n} className={MRT_ACTION_BTN} data-active={p.n === page} title={t('tip.sheet')} onClick={() => setPage(p.n)} style={p.n === page ? { fontWeight: 700 } : {}}>{t('dw.sheet', { n: p.n })}</button>)}
      {details && <span className="qr-muted">{t('dw.text', { mode: pg?.quality?.mode })}{pg?.quality?.reasons?.length ? ` (${pg.quality.reasons.join(', ')})` : ''}{pg?.ocr ? ' · ' + t('dw.ocrInfo', { dpi: pg.ocr.dpi, words: pg.ocr.words.length, sec: pg.ocr.seconds }) : ''}{pg?.ocrError ? ' · ' + t('dw.ocrError', { text: pg.ocrError }) : ''}</span>}
      {details && <label className="qr-row" style={{ marginInlineStart: 'auto' }}><input type="checkbox" checked={showOcr} onChange={(e) => setShowOcr(e.target.checked)} /> {t('dw.ocrWords')}</label>}
    </div>
    <div ref={ref} className="qr-draw-vp" style={{ cursor: drag.current ? 'grabbing' : 'grab' }} dir="ltr" data-testid="drawing-viewport" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onDragStart={(e) => e.preventDefault()} onDoubleClick={() => { setAuto(true); autoRef.current = true; refit(); }}>
      {!img ? <div className="qr-muted" style={{ padding: 20 }}>{t('dw.rendering')}</div> :
        <div className="qr-sheet" style={{ width: W }} data-testid="drawing-sheet">
          <img src={img.png} style={{ width: W }} draggable={false} />
          {ocrWords.map((w: any, i: number) => <div key={'o' + i} className="qr-mark" data-kind="ocr" title={`OCR "${w.text}" ${Math.round(w.conf * 100)}%`} style={{ left: w.x * k, top: w.y * k, width: w.w * k, height: w.h * k, opacity: w.conf < 0.6 ? 1 : 0.5 }} />)}
          {marks.map((m: any) => <div key={m.id} className="qr-mark" data-kind={focus && focus.id === m.id ? 'focus' : m.severity} title={m.message} style={{ left: m.loc.x * k - 4, top: m.loc.y * k - 4, width: m.loc.w * k + 8, height: m.loc.h * k + 8 }} />)}
          {focus && focus.bbox && focus.page === page && <div className="qr-mark" data-kind="focus" style={{ left: focus.bbox.x * k - 4, top: focus.bbox.y * k - 4, width: focus.bbox.w * k + 8, height: focus.bbox.h * k + 8 }} />}
        </div>}
    </div>
  </div>;
}

export function RouteCard({ part }: any) {
  return <div className="qr-route-card" data-testid="route-card">
    <div className="head">
      <div><b>{t('rc.part')}</b><span className="qr-ltr">{part.partNo}</span></div><div><b>{t('rc.rev')}</b>{part.rev || '-'}</div><div><b>{t('rc.customer')}</b>{part.customer}</div><div><b>{t('rc.material')}</b><span>{L(part.material, 'normalized') || '—'}</span></div>
      <div style={{ gridColumn: 'span 2' }}><b>{t('rc.title')}</b>{part.title}</div><div><b>{t('rc.source')}</b>{L(part, 'routeSource')}</div><div><b>{t('rc.status')}</b>{tReadiness(part.readiness)} · {t('rc.readOnly')}</div>
    </div>
    <table className="qr-table">
      <thead><tr><th style={{ width: 50 }}>{t('rc.step')}</th><th style={{ width: 120 }}>{t('rc.operation')}</th><th>{t('rc.instructions')}</th><th style={{ width: 170 }}>{t('rc.specs')}</th><th style={{ width: 110 }}>{t('rc.src')}</th><th style={{ width: 90 }}>{t('rc.flags')}</th></tr></thead>
      <tbody>{part.route.map((s: any, i: number) => <tr key={i} style={s.blocked ? { background: '#fff7ed' } : {}}>
        <td>{s.seq}</td><td style={{ textTransform: 'capitalize' }}>{L(s, 'type')}{s.title ? <div className="qr-muted">{L(s, 'title')}</div> : null}</td>
        <td>{s.items.map((it: any, j: number) => <div key={j}>{it.seq && it.seq !== s.seq ? <b>{it.seq} </b> : null}<bdi>{L(it, 'text')}</bdi></div>)}</td>
        <td>{(s.specRefs || []).join(', ')}</td><td>{L(s, 'source')}</td>
        <td>{s.outsourced && <Chip t="info">{t('rc.outsourced')}</Chip>} {s.blocked && <Chip t="danger">{t('rc.waiting')}</Chip>}{s.moved && <Chip t="attention">{t('rc.moved')}</Chip>}</td></tr>)}</tbody>
    </table>
    {!part.route.length && <div className="qr-muted" style={{ padding: 10 }}>{t('rc.none')}</div>}
  </div>;
}

export function ModelView({ part }: any) {
  return <div style={{ padding: 14 }}>
    <h3 style={{ marginTop: 0 }}>{t('mv.title')}</h3>
    {part.model ? <div className="qr-kv"><div>{t('mv.file')}</div><div className="qr-ltr">{part.model.path}</div><div>{t('mv.stepName')}</div><div className="qr-ltr">{part.model.fileName}</div><div>{t('mv.schema')}</div><div>{part.model.schema}</div><div>{t('mv.size')}</div><div>{Math.round(part.model.size / 1024)} KB</div></div>
      : <div><Chip t="attention">{t('mv.notFound')}</Chip></div>}
    <h4>{t('mv.log')}</h4><ul dir="ltr">{(part.modelSearchLog || []).map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
    <div className="qr-muted">{t('mv.noViewer')}</div>
  </div>;
}

export function DataView({ part }: any) {
  return <div style={{ padding: 12 }}>
    <div className="qr-kv" style={{ marginBottom: 12 }}>
      <div>{t('dv.material')}</div><div>{L(part.material, 'normalized')} <span className="qr-muted">({L(part.material, 'source')}{part.material?.raw ? `: "${part.material.raw}"` : ''}) · {part.material?.family}</span></div>
      <div>{t('dv.bomSource')}</div><div>{part.bomSource || '—'}</div><div>{t('dv.partsList')}</div><div>{part.partsList?.name || '—'}</div>
    </div>
    {part.zones && <><h4>{t('dv.zones')}</h4><table className="qr-table"><thead><tr><th>{t('dv.note')}</th><th>{t('dv.text')}</th><th>{t('dv.perSheet')}</th><th>{t('dv.total')}</th></tr></thead><tbody>{part.zones.map((z: any) => <tr key={z.note}><td>{z.note}</td><td>{z.text}</td><td>{Object.entries(z.perSheet).map(([s, c]) => t('dv.sheetN', { s, c })).join(', ') || '—'}</td><td>{z.total}</td></tr>)}</tbody></table></>}
    <h4>{t('dv.threads')}</h4><table className="qr-table"><thead><tr><th>{t('dv.thread')}</th><th>{t('dv.callout')}</th><th>{t('dv.qty')}</th><th>{t('dv.insert')}</th></tr></thead><tbody>{part.threads.map((th: any, i: number) => <tr key={i}><td>{th.thread}</td><td>{th.raw}</td><td>{th.qty}</td><td>{th.insert}</td></tr>)}</tbody></table>
    {part.bom.length > 0 && <><h4>{t('dv.bom')}</h4><table className="qr-table"><thead><tr><th>{t('dv.seq')}</th><th>{t('dv.partNo')}</th><th>{t('dv.catalog')}</th><th>{t('dv.desc')}</th><th>{t('dv.qty')}</th></tr></thead><tbody>{part.bom.map((b: any, i: number) => <tr key={i}><td>{b.seq}</td><td>{b.partNo}</td><td>{b.catalogNo}</td><td>{b.desc}{b.alternatives?.length ? <div className="qr-muted">{t('dv.alt', { list: b.alternatives.map((a: any) => a.partNo).join(', ') })}</div> : null}</td><td>{b.qty} {b.uom}</td></tr>)}</tbody></table></>}
    <h4>{t('dv.notes')}</h4><table className="qr-table"><tbody>{part.notes.map((n: any, i: number) => <tr key={i}><td style={{ width: 40 }}>{n.n}</td><td>{n.text}</td></tr>)}</tbody></table>
  </div>;
}

