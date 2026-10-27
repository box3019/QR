import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MRT_ACTION_BTN_TOPBAR, MRT_BTN, MRT_BTN_PRIMARY, MRT_ACTION_BTN } from './ui/mrtButtons';
import { Chip, Modal } from './ui/common';
import SettingsDialog from './settings/SettingsDialog';
import { t, tReadiness, setLang, setTextSize, getLang } from './i18n';
import { PlainStatusBadge, FirstRun } from './ui/simple';
import { ProcessesPanel } from './ui/processes';
import { groupParts } from './parts/groups.mjs';
import { PartGroup } from './parts/PartGroup';
import { Tutorial } from './tutorial/Tutorial';

declare global { interface Window { qr: any } }
const qr = () => window.qr;
type Part = any;

/** Hebrew display field when HE is active (core adds xxxHe fields). */
const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
const tone = (sev: string) => (sev === 'Blocker' ? 'danger' : sev === 'Question' ? 'attention' : 'info');
const readinessTone = (r: string) => (/^Ready/.test(r) ? 'ready' : /Blocked/.test(r) ? 'danger' : /n\/a/.test(r) ? 'neutral' : 'attention');


function TopButton({ icon, label, tip, onClick, disabled, testid, active }: any) {
  return <button type="button" title={tip || label} data-active={active} className={MRT_ACTION_BTN_TOPBAR} onClick={onClick} disabled={disabled} data-testid={testid}><span className="ico" aria-hidden>{icon}</span><span>{label}</span></button>;
}

export default function App() {
  const [settings, setSettings] = useState<any>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<'drawing' | 'route' | 'model' | 'data'>('drawing');
  const [busy, setBusy] = useState<{ text: string; progress?: number; log: string[] } | null>(null);
  const [over, setOver] = useState(false);
  const [dialog, setDialog] = useState<null | 'settings' | 'questions' | 'summary' | 'tutorial'>(null);
  const [focus, setFocus] = useState<any>(null);
  const [lastRun, setLastRun] = useState<any>(null);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [details, setDetails] = useState(false);
  (window as any).__qrDetails = setDetails;

  useEffect(() => { qr().getSettings().then(setSettings); }, []);
  if (settings) { setLang(settings.uiLanguage); setTextSize(settings.textSize); }
  (window as any).__qrSetSettings = (patch: any) => setSettings((o: any) => ({ ...o, ...patch }));
  useEffect(() => qr().onEvent((ev: any) => {
    setBusy((b) => {
      if (!b) return b;
      if (ev.type === 'status') return { ...b, text: ev.text, progress: undefined, log: [...b.log, ev.text].slice(-200) };
      if (ev.type === 'progress') return { ...b, progress: ev.value };
      if (ev.type === 'error') return { ...b, log: [...b.log, t('busy.error', { text: ev.text.split('\n')[0] })] };
      if (ev.type === 'part') return { ...b, log: [...b.log, t('busy.analyzed', { pn: ev.part.partNo })] };
      return b;
    });
    if (ev.type === 'part') setParts((p) => [...p, ev.part]);
  }), []);

  const run = useCallback(async (paths: string[]) => {
    if (!paths.length) return;
    setParts([]); setRfqs([]); setUnknown([]); setLastRun(null); setSel(0); setFocus(null); setBusy({ text: t('busy.starting'), log: [] });
    try { const r = await qr().process(paths); setParts(r.parts); setUnknown([...(r.unknown || []), ...(r.other || [])]); setRfqs(r.rfqs || []); setLastRun({ seconds: r.seconds, files: r.files }); }
    catch (e: any) { alert(t('err.processing', { text: e?.message || e })); }
    finally { setBusy(null); }
  }, []);
  (window as any).__qrRun = run; // hooks for automated self-tests
  (window as any).__qrParts = parts;
  (window as any).__qrRfqs = rfqs;
  (window as any).__qrUnknown = unknown;
  (window as any).__qrSelect = (i: number, t?: any) => { setSel(i); if (t) setTab(t); };
  (window as any).__qrDialog = setDialog;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const paths = Array.from(e.dataTransfer.files).map((f) => qr().pathForFile(f)).filter(Boolean);
    if (paths.length) return run(paths);
    // dragged straight from Outlook: no file in the drop, take the selected e-mail(s) from Outlook
    if (settings && settings.outlookDrag === false) return;
    qr().outlookSelection().then(run).catch((x: any) => alert(String(x?.message || x)));
  };
  const part = parts[sel];
  const updatePart = (fn: (p: Part) => Part) => setParts((ps) => ps.map((p, i) => (i === sel ? fn(structuredClone(p)) : p)));

  return (
    <div className="qr-root" data-mrt-palette="industrial-steel" data-mrt-theme="light"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <div className="qr-topbar mrt-workspace-topbar-chrome">
        <div className="qr-brand"><span className="qr-brand-badge">QR</span></div>
        <TopButton icon="＋" label={t('top.addFiles')} tip={t('tip.addFiles')} testid="btn-add" onClick={async () => run(await qr().pickFiles())} />
        <TopButton icon="📁" label={t('top.addFolder')} tip={t('tip.addFolder')} onClick={async () => { const f = await qr().pickFolder(); if (f) run([f]); }} />
        <TopButton icon="❓" label={t('top.questions')} tip={t('tip.questions')} testid="btn-questions" disabled={!parts.length} onClick={() => setDialog('questions')} />
        <TopButton icon="☰" label={t('top.summary')} tip={t('tip.summary')} testid="btn-summary" disabled={!parts.length} onClick={() => setDialog('summary')} />
        <div style={{ flex: 1 }} />
        <TopButton icon="🔍" label={t('top.details')} tip={t('tip.details')} testid="btn-details" active={details} onClick={() => setDetails(!details)} />
        {details && lastRun && <span className="qr-muted" data-testid="run-info">{t('top.runInfo', { parts: parts.length, files: lastRun.files.length, sec: lastRun.seconds })}</span>}
        <TopButton icon="⚙" label={t('top.settings')} tip={t('tip.settings')} testid="btn-settings" onClick={() => setDialog('settings')} />
        <TopButton icon="?" label={t('top.help')} tip={t('tip.help')} testid="btn-help" onClick={() => setDialog('tutorial')} />
      </div>

      {!parts.length ? (
        <div className="qr-drop" data-over={over} data-testid="dropzone">
          <div>
            <h1>{t('drop.title')}</h1>
            <div className="qr-muted" style={{ fontSize: '1.05rem', marginBottom: 6 }}>{t('drop.hint')}</div><div className="qr-muted" style={{ marginBottom: 18 }}>{t('drop.hint2')}</div>
            <button className={MRT_BTN_PRIMARY + ' qr-big'} title={t('tip.addFiles')} onClick={async () => run(await qr().pickFiles())}>{t('drop.choose')}</button>
            {unknown.length > 0 && <div className="qr-muted" style={{ marginTop: 12 }}>{t('drop.notDrawings', { list: unknown.join(', ') })}</div>}
          </div>
        </div>
      ) : (<>
        {rfqs.map((r: any, i: number) => <RfqBar key={i} rfq={r} />)}
        <div className="qr-body">
          <PartsPanel details={details} parts={parts} sel={sel} setSel={(i: number) => { setSel(i); setFocus(null); }} unknown={unknown} />
          <div className="qr-panel">
            <div className="qr-tabs">
              {(['drawing', 'route', 'model', ...(details ? ['data'] : [])] as any[]).map((k) => (
                <button key={k} className="qr-tab" data-active={tab === k} data-testid={'tab-' + k} title={t('tip.tab')} onClick={() => setTab(k)}>{t('tab.' + k)}</button>))}
            </div>
            <div className="qr-scroll">
              {part && tab === 'drawing' && <DrawingView part={part} focus={focus} details={details} />}
              {part && tab === 'route' && <RouteCard part={part} />}
              {part && tab === 'model' && <ModelView part={part} />}
              {part && tab === 'data' && <DataView part={part} />}
            </div>
          </div>
          {part && <ProblemsPanel details={details} part={part} onFocus={(loc: any) => { setTab('drawing'); setFocus(loc); }} updatePart={updatePart} />}
        </div>
      </>)}
      {busy && <div className="qr-busy" data-testid="busy"><div>{busy.text}</div>{busy.progress != null && <div className="qr-bar"><div style={{ width: Math.round(busy.progress * 100) + '%' }} /></div>}</div>}
      {dialog === 'settings' && settings && <SettingsDialog settings={settings} onClose={() => setDialog(null)} onSave={async (s: any) => { setSettings(await qr().setSettings(s)); setDialog(null); }} />}
      {dialog === 'questions' && <QuestionsDialog parts={parts} lang0={parts.find((p: any) => p.questionsLanguage)?.questionsLanguage || settings?.questionsLanguage || 'he'} onClose={() => setDialog(null)} />}
      {settings && !settings.firstRunDone && !parts.length && !busy && <FirstRun onClose={async () => setSettings(await qr().setSettings({ ...settings, firstRunDone: true }))} />}
      {dialog === 'summary' && <SummaryDialog parts={parts} onClose={() => setDialog(null)} />}
      {dialog === 'tutorial' && <Tutorial lang0={getLang()} onClose={() => setDialog(null)} />}
    </div>
  );
}


function PartsPanel({ parts, sel, setSel, unknown, details }: any) {
  return <div className="qr-panel" data-testid="parts-panel">
    <div className="qr-panel-h">{t('parts.title')} <span className="qr-muted">({parts.length})</span></div>
    <div className="qr-scroll">
      {groupParts(parts).map((g: any) => <PartGroup key={g.key} k={g.key} n={g.items.length}>{g.items.map(({ part: p, index: i }: any) => {
        const b = p.problems.filter((x: any) => x.severity === 'Blocker' && x.status !== 'resolved').length;
        const q = p.problems.filter((x: any) => x.severity === 'Question' && x.status !== 'resolved').length;
        const tk = p.tasks.filter((x: any) => x.status !== 'done').length;
        return <div key={p.id} className="qr-part" data-active={i === sel} onClick={() => setSel(i)} data-testid="part-item">
          <div className="qr-row"><span className="pn qr-ltr">{p.partNo || p.drawing.name}</span><span className="qr-muted">{t('parts.rev')} <span className="qr-ltr">{p.rev || '-'}</span></span><span style={{ flex: 1 }} />{p.rfq && <span data-testid="part-qty" style={{ fontWeight: 600, marginInlineEnd: 6 }}>{t('parts.qty')} {p.rfq.qty ?? '?'}{p.rfq.uom && p.rfq.uom !== 'EA' ? ' ' + p.rfq.uom : ''}</span>}<Chip t="neutral">{p.customer}</Chip></div>
          <div className="qr-muted" style={{ margin: '2px 0 4px', fontSize: '0.75rem' }}>{p.title}</div>
          <div className="qr-row" style={{ marginBottom: 4 }}>
            <PlainStatusBadge part={p} />
            <span style={{ fontSize: '0.75rem' }}>{L(p.material, 'normalized') || t('parts.noMaterial')}</span>
          </div>
          {p.status !== 'accepted' && p.rejectReason && <div style={{ color: '#991b1b', fontSize: '0.75rem', marginBottom: 4 }}>{L(p, 'rejectReason')}</div>}
          <div className="qr-row">
            {details && <Chip t={readinessTone(p.readiness)}>{tReadiness(p.readiness)}</Chip>}
            {details && b > 0 && <Chip t="danger">{t('parts.blockers', { n: b })}</Chip>}{details && q > 0 && <Chip t="attention">{t('parts.questions', { n: q })}</Chip>}{details && tk > 0 && <Chip t="info">{t('parts.tasks', { n: tk })}</Chip>}
            {details && <Chip t={p.textMode === 'Text' ? 'neutral' : 'info'}>{p.textMode === 'Text' ? t('parts.textPdf') : p.textMode === 'OCR' ? t('parts.ocr') : t('parts.textOcr')}</Chip>}
          </div>
        </div>;
      })}</PartGroup>)}
      {unknown.length > 0 && <div className="qr-part qr-muted">{t('parts.other', { list: unknown.join(', ') })}</div>}
    </div>
  </div>;
}

function DrawingView({ part, focus, details }: any) {
  const [page, setPage] = useState(focus?.page || 1);
  const [img, setImg] = useState<any>(null);
  const [showOcr, setShowOcr] = useState(true);
  const ocrOn = showOcr && details;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus?.page) setPage(focus.page); }, [focus]);
  useEffect(() => { let live = true; setImg(null); qr().preview(part.drawing.path, page, 2600).then((r: any) => live && setImg(r)); return () => { live = false; }; }, [part.drawing.path, page]);
  const pg = part.drawing.pages.find((p: any) => p.n === page) || part.drawing.pages[0];
  const W = 1500; // displayed width
  const k = img ? W / img.width : 1;
  useEffect(() => { if (img && focus && ref.current) { const el = ref.current.querySelector('[data-kind="focus"]') as HTMLElement; el?.scrollIntoView({ block: 'center', inline: 'center' }); } }, [img, focus]);
  const marks = part.problems.filter((p: any) => p.loc && p.loc.page === page);
  const ocrWords = ocrOn && pg?.ocr ? pg.ocr.words : [];
  return <div>
    <div className="qr-row" style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
      <b className="qr-ltr">{part.drawing.name}</b>
      {part.drawing.pages.map((p: any) => <button key={p.n} className={MRT_ACTION_BTN} data-active={p.n === page} title={t('tip.sheet')} onClick={() => setPage(p.n)} style={p.n === page ? { fontWeight: 700 } : {}}>{t('dw.sheet', { n: p.n })}</button>)}
      {details && <span className="qr-muted">{t('dw.text', { mode: pg?.quality?.mode })}{pg?.quality?.reasons?.length ? ` (${pg.quality.reasons.join(', ')})` : ''}{pg?.ocr ? ' · ' + t('dw.ocrInfo', { dpi: pg.ocr.dpi, words: pg.ocr.words.length, sec: pg.ocr.seconds }) : ''}{pg?.ocrError ? ' · ' + t('dw.ocrError', { text: pg.ocrError }) : ''}</span>}
      {details && <label className="qr-row" style={{ marginInlineStart: 'auto' }}><input type="checkbox" checked={showOcr} onChange={(e) => setShowOcr(e.target.checked)} /> {t('dw.ocrWords')}</label>}
    </div>
    <div ref={ref} style={{ overflow: 'auto' }} dir="ltr">
      {!img ? <div className="qr-muted" style={{ padding: 20 }}>{t('dw.rendering')}</div> :
        <div className="qr-sheet" style={{ width: W }} data-testid="drawing-sheet">
          <img src={img.png} style={{ width: W }} />
          {ocrWords.map((w: any, i: number) => <div key={'o' + i} className="qr-mark" data-kind="ocr" title={`OCR "${w.text}" ${Math.round(w.conf * 100)}%`} style={{ left: w.x * k, top: w.y * k, width: w.w * k, height: w.h * k, opacity: w.conf < 0.6 ? 1 : 0.5 }} />)}
          {marks.map((m: any) => <div key={m.id} className="qr-mark" data-kind={focus && focus.id === m.id ? 'focus' : m.severity} title={m.message} style={{ left: m.loc.x * k - 4, top: m.loc.y * k - 4, width: m.loc.w * k + 8, height: m.loc.h * k + 8 }} />)}
          {focus && focus.bbox && focus.page === page && <div className="qr-mark" data-kind="focus" style={{ left: focus.bbox.x * k - 4, top: focus.bbox.y * k - 4, width: focus.bbox.w * k + 8, height: focus.bbox.h * k + 8 }} />}
        </div>}
    </div>
  </div>;
}

function RouteCard({ part }: any) {
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
    <ProcessesPanel part={part} />
  </div>;
}

function ModelView({ part }: any) {
  return <div style={{ padding: 14 }}>
    <h3 style={{ marginTop: 0 }}>{t('mv.title')}</h3>
    {part.model ? <div className="qr-kv"><div>{t('mv.file')}</div><div className="qr-ltr">{part.model.path}</div><div>{t('mv.stepName')}</div><div className="qr-ltr">{part.model.fileName}</div><div>{t('mv.schema')}</div><div>{part.model.schema}</div><div>{t('mv.size')}</div><div>{Math.round(part.model.size / 1024)} KB</div></div>
      : <div><Chip t="attention">{t('mv.notFound')}</Chip></div>}
    <h4>{t('mv.log')}</h4><ul dir="ltr">{(part.modelSearchLog || []).map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
    <div className="qr-muted">{t('mv.noViewer')}</div>
  </div>;
}

function DataView({ part }: any) {
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

function ProblemLine({ p, onFocus, updatePart }: any) {
  const toggle = (e: any) => { e.stopPropagation(); updatePart((pt: any) => { const x = pt.problems.find((y: any) => y.id === p.id); x.status = x.status === 'resolved' ? 'open' : 'resolved'; return pt; }); };
  return <div className="qr-prob" data-testid="problem" onClick={() => p.loc && onFocus({ ...p.loc, id: p.id, bbox: null })} style={p.status === 'resolved' ? { opacity: .5 } : {}}>
    <div className="qr-row"><Chip t={tone(p.severity)}>{t('sev.' + p.severity)}</Chip><b>{L(p, 'category')}</b>{p.loc && <span className="qr-muted">{t('pr.sheet', { n: p.loc.page })}</span>}<span style={{ flex: 1 }} />
      {p.severity !== 'Info' && <button className={MRT_ACTION_BTN} title={p.status === 'resolved' ? t('pr.reopen') : t('pr.resolve')} onClick={toggle}>{p.status === 'resolved' ? '↺' : '✓'}</button>}</div>
    <div className="msg"><bdi>{L(p, 'message')}</bdi>{L(p, 'suggestion') && <span className="qr-muted"> → {L(p, 'suggestion')}</span>}</div>
  </div>;
}

function ProblemsPanel({ part, onFocus, updatePart, details }: any) {
  const probs = part.problems;
  const order: any = { Blocker: 0, Question: 1, Info: 2 };
  const sorted = [...probs].sort((a, b) => order[a.severity] - order[b.severity]);
  const main = sorted.filter((p: any) => p.severity !== 'Info');
  const info = sorted.filter((p: any) => p.severity === 'Info');
  const uploads = part.tasks.filter((t: any) => t.type === 'uploadDocument');
  const verify = part.tasks.filter((t: any) => t.type === 'verify');
  return <div className="qr-panel" data-testid="problems-panel">
    <div className="qr-panel-h">{t('pr.title')} <span className="qr-muted">({probs.filter((p: any) => p.severity !== 'Info').length})</span> · {t('pr.tasks')} <span className="qr-muted">({part.tasks.filter((x: any) => x.status !== 'done').length})</span></div>
    <div className="qr-scroll">
      <div className="qr-sec">{t('pr.title')}</div>
      {!main.length && <div className="qr-prob qr-muted" data-testid="no-problems">{t('pr.none')}</div>}
      {main.map((p: any) => <ProblemLine key={p.id} p={p} onFocus={onFocus} updatePart={updatePart} />)}
      {info.length > 0 && <details className="qr-info-group" data-testid="info-group"><summary>{t('pr.info', { n: info.length })}</summary>{info.map((p: any) => <ProblemLine key={p.id} p={p} onFocus={onFocus} updatePart={updatePart} />)}</details>}
      <div className="qr-sec">{t('pr.uploads', { n: uploads.filter((x: any) => x.status !== 'done').length })}</div>
      {uploads.map((tk: any) => <div key={tk.id} className="qr-prob" data-testid="task">
        <div className="qr-row"><Chip t={tk.status === 'done' ? 'ready' : 'info'}>{tk.status === 'done' ? t('pr.uploaded') : t('pr.upload')}</Chip><b className="qr-ltr">{tk.refNumber}</b><span className="qr-muted">{L(tk, 'title').replace(/^\S+ \S+ /, '')} · {t('pr.blocks', { n: L(tk, 'blocks') })}</span></div>
        <div className="qr-row" style={{ marginTop: 4 }}><button className={MRT_ACTION_BTN} title={t('tip.attach')} onClick={async () => { const f = tk.status === 'done' ? [] : await qr().pickFiles(); updatePart((pt: any) => { const x = pt.tasks.find((y: any) => y.id === tk.id); if (x.status === 'done') { x.status = 'open'; x.file = ''; } else if (f.length) { x.status = 'done'; x.file = f[0]; } return pt; }); }}>{tk.status === 'done' ? t('pr.undo') : t('pr.attach')}</button>{tk.file && <span className="qr-muted">{tk.file}</span>}</div>
      </div>)}
      {details && verify.length > 0 && <details className="qr-info-group"><summary>{t('pr.verify', { n: verify.length })}</summary>
        {verify.map((tk: any) => <div key={tk.id} className="qr-prob" onClick={() => onFocus({ page: tk.page, bbox: tk.bbox, id: tk.id })}><div className="msg">{L(tk, 'title')}</div></div>)}</details>}
      <div className="qr-sec">{t('pr.refs')}</div>
      {part.refs.map((r: any, i: number) => <div key={i} className="qr-prob" style={{ cursor: 'default' }}><div className="qr-row"><Chip t={r.kind === 'public' ? 'neutral' : r.kind === 'vendor' ? 'info' : 'attention'}>{t('ref.' + r.kind)}</Chip><b className="qr-ltr">{r.number}</b></div><div className="qr-muted" style={{ fontSize: '0.75rem' }}>{L(r, 'description')}{r.owner ? ' · ' + L(r, 'owner') : ''}</div></div>)}
    </div>
  </div>;
}

function QuestionsDialog({ parts, lang0, onClose }: any) {
  const [lang, setLang] = useState(lang0);
  const [html, setHtml] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { qr().questionsPreview(parts, lang).then((r: any) => setHtml(r.html)); }, [lang, parts]);
  return <Modal title={t('q.title')} onClose={onClose} testid="questions-dialog" footer={<>
    {msg && <span className="qr-muted" style={{ marginInlineEnd: 'auto' }}>{msg}</span>}
    <button className={MRT_BTN} title={t('tip.close')} onClick={onClose}>{t('q.close')}</button>
    <span className="qr-muted" data-testid="export-lang">{t('q.exportLang', { lang: lang === 'he' ? t('q.he') : t('q.en') })}</span>
    <button className={MRT_BTN_PRIMARY} data-testid="export-questions" title={t('tip.export')} onClick={async () => { const r = await qr().exportQuestions(parts, lang); if (r) { setMsg(t('q.saved', { path: r.pdf })); qr().openPath(r.pdf); } }}>{t('q.export')}</button></>}>
    <div className="qr-row" style={{ marginBottom: 8 }}>{t('q.language')}
      <button className={lang === 'he' ? MRT_BTN_PRIMARY : MRT_BTN} data-testid="lang-he" title={t('tip.lang')} onClick={() => setLang('he')}>עברית</button>
      <button className={lang === 'en' ? MRT_BTN_PRIMARY : MRT_BTN} data-testid="lang-en" title={t('tip.lang')} onClick={() => setLang('en')}>English</button></div>
    <iframe title="questions" srcDoc={html} style={{ width: '100%', height: '62vh', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }} />
  </Modal>;
}

function SummaryDialog({ parts, onClose }: any) {
  const [msg, setMsg] = useState('');
  return <Modal title={t('sum.title')} onClose={onClose} testid="summary-dialog" footer={<>
    {msg && <span className="qr-muted" style={{ marginInlineEnd: 'auto' }}>{msg}</span>}
    <button className={MRT_BTN} title={t('tip.csv')} onClick={async () => { const r = await qr().exportSummary(parts, 'csv'); if (r) setMsg(t('q.saved', { path: r.path })); }}>{t('sum.csv')}</button>
    <button className={MRT_BTN_PRIMARY} title={t('tip.pdf')} onClick={async () => { const r = await qr().exportSummary(parts, 'pdf'); if (r) setMsg(t('q.saved', { path: r.path })); }}>{t('sum.pdf')}</button></>}>
    <table className="qr-table"><thead><tr><th>{t('rc.part')}</th><th>{t('rc.rev')}</th><th>{t('rc.customer')}</th><th>{t('rc.material')}</th><th>{t('rc.status')}</th><th>{t('sum.readiness')}</th><th>{t('sum.blockers')}</th><th>{t('sum.questions')}</th><th>{t('sum.tasks')}</th><th>{t('sum.model')}</th></tr></thead>
      <tbody>{parts.map((p: Part) => <tr key={p.id}><td>{p.partNo}</td><td>{p.rev}</td><td>{p.customer}</td><td>{L(p.material, 'normalized')}</td><td><PlainStatusBadge part={p} /></td><td>{tReadiness(p.readiness)}</td>
        <td>{p.problems.filter((x: any) => x.severity === 'Blocker').length}</td><td>{p.problems.filter((x: any) => x.severity === 'Question').length}</td><td>{p.tasks.filter((x: any) => x.status !== 'done').length}</td><td>{p.model ? t('sum.found') : '—'}</td></tr>)}</tbody></table>
  </Modal>;
}

function RfqBar({ rfq }: any) {
  const miss = rfq.match || {};
  return <div className="qr-rfq" data-testid="rfq-bar">
    <b>RFQ {rfq.rfq_no || '-'}</b>
    {rfq.assembly && <span>{t('rfq.assembly', { a: rfq.assembly })}</span>}
    <span>{t('rfq.customer', { c: rfq.customer || t('rfq.unknown') })}{rfq.intermediary ? t('rfq.via', { x: rfq.intermediary }) : ''}</span>
    <span>{t('rfq.from', { x: (rfq.original_sender?.name || rfq.sender?.name || '') + (rfq.original_sent ? ', ' + rfq.original_sent : '') })}</span>
    <span>{t('rfq.lines', { n: rfq.rows.length, list: '' })}<span className="qr-ltr">{rfq.rows.map((x: any) => x.part_no + ' x' + (x.qty ?? '?')).join(', ')}</span></span>
    {miss.rows_without_drawing?.length > 0 && <Chip t="danger">{t('rfq.noDrawing', { list: miss.rows_without_drawing.join(', ') })}</Chip>}
    {miss.parts_without_row?.length > 0 && <Chip t="attention">{t('rfq.notInRfq', { list: miss.parts_without_row.join(', ') })}</Chip>}
    {rfq.requirements?.length > 0 && <span className="qr-muted" dir="auto" title={rfq.requirements.join('\n')}>{t('rfq.reqs', { n: rfq.requirements.length })}</span>}
  </div>;
}
