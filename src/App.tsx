import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MRT_ACTION_BTN_TOPBAR, MRT_BTN, MRT_BTN_PRIMARY, MRT_ACTION_BTN } from './ui/mrtButtons';

declare global { interface Window { qr: any } }
const qr = () => window.qr;
type Part = any;

const tone = (sev: string) => (sev === 'Blocker' ? 'danger' : sev === 'Question' ? 'attention' : 'info');
const readinessTone = (r: string) => (/^Ready/.test(r) ? 'ready' : /Blocked/.test(r) ? 'danger' : /n\/a/.test(r) ? 'neutral' : 'attention');

function Chip({ t, children, testid }: { t: string; children: any; testid?: string }) { return <span className="qr-chip" data-tone={t} data-testid={testid}>{children}</span>; }

function TopButton({ icon, label, onClick, disabled, testid }: any) {
  return <button type="button" className={MRT_ACTION_BTN_TOPBAR} onClick={onClick} disabled={disabled} data-testid={testid}><span className="ico" aria-hidden>{icon}</span><span>{label}</span></button>;
}

export default function App() {
  const [settings, setSettings] = useState<any>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<'drawing' | 'route' | 'model' | 'data'>('drawing');
  const [busy, setBusy] = useState<{ text: string; progress?: number; log: string[] } | null>(null);
  const [over, setOver] = useState(false);
  const [dialog, setDialog] = useState<null | 'settings' | 'questions' | 'summary'>(null);
  const [focus, setFocus] = useState<any>(null);
  const [lastRun, setLastRun] = useState<any>(null);

  useEffect(() => { qr().getSettings().then(setSettings); }, []);
  useEffect(() => qr().onEvent((ev: any) => {
    setBusy((b) => {
      if (!b) return b;
      if (ev.type === 'status') return { ...b, text: ev.text, progress: undefined, log: [...b.log, ev.text].slice(-200) };
      if (ev.type === 'progress') return { ...b, progress: ev.value };
      if (ev.type === 'error') return { ...b, log: [...b.log, 'Error: ' + ev.text.split('\n')[0]] };
      if (ev.type === 'part') return { ...b, log: [...b.log, `Analyzed ${ev.part.partNo}`] };
      return b;
    });
    if (ev.type === 'part') setParts((p) => [...p, ev.part]);
  }), []);

  const run = useCallback(async (paths: string[]) => {
    if (!paths.length) return;
    setParts([]); setSel(0); setFocus(null); setBusy({ text: 'Starting…', log: [] });
    try { const r = await qr().process(paths); setParts(r.parts); setUnknown(r.unknown || []); setLastRun({ seconds: r.seconds, files: r.files }); }
    catch (e: any) { alert('Processing failed: ' + (e?.message || e)); }
    finally { setBusy(null); }
  }, []);
  (window as any).__qrRun = run; // hooks for automated self-tests
  (window as any).__qrParts = parts;
  (window as any).__qrSelect = (i: number, t?: any) => { setSel(i); if (t) setTab(t); };
  (window as any).__qrDialog = setDialog;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const paths = Array.from(e.dataTransfer.files).map((f) => qr().pathForFile(f)).filter(Boolean);
    run(paths);
  };
  const part = parts[sel];
  const updatePart = (fn: (p: Part) => Part) => setParts((ps) => ps.map((p, i) => (i === sel ? fn(structuredClone(p)) : p)));

  return (
    <div className="qr-root" data-mrt-palette="industrial-steel" data-mrt-theme="light"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <div className="qr-topbar mrt-workspace-topbar-chrome">
        <div className="qr-brand"><span className="qr-brand-badge">QR</span>Quote Request</div>
        <TopButton icon="＋" label="Add files" testid="btn-add" onClick={async () => run(await qr().pickFiles())} />
        <TopButton icon="📁" label="Add folder" onClick={async () => { const f = await qr().pickFolder(); if (f) run([f]); }} />
        <TopButton icon="❓" label="Questions" testid="btn-questions" disabled={!parts.length} onClick={() => setDialog('questions')} />
        <TopButton icon="☰" label="Summary" testid="btn-summary" disabled={!parts.length} onClick={() => setDialog('summary')} />
        <div style={{ flex: 1 }} />
        {lastRun && <span className="qr-muted" data-testid="run-info">{parts.length} part(s) · {lastRun.files.length} file(s) · {lastRun.seconds}s</span>}
        <TopButton icon="⚙" label="Settings" testid="btn-settings" onClick={() => setDialog('settings')} />
      </div>

      {!parts.length ? (
        <div className="qr-drop" data-over={over} data-testid="dropzone">
          <div>
            <h1>Drop drawings, models or a ZIP here</h1>
            <div className="qr-muted" style={{ fontSize: 15, marginBottom: 16 }}>PDF drawings, parts lists, STEP / IGES / SLDPRT models, folders and ZIP archives. Processing starts automatically.</div>
            <button className={MRT_BTN_PRIMARY} onClick={async () => run(await qr().pickFiles())}>Choose files…</button>
            {unknown.length > 0 && <div className="qr-muted" style={{ marginTop: 12 }}>Not drawings: {unknown.join(', ')}</div>}
          </div>
        </div>
      ) : (
        <div className="qr-body">
          <PartsPanel parts={parts} sel={sel} setSel={(i: number) => { setSel(i); setFocus(null); }} unknown={unknown} />
          <div className="qr-panel">
            <div className="qr-tabs">
              {([['drawing', 'Drawing'], ['route', 'Route card'], ['model', 'Model'], ['data', 'Extracted data']] as const).map(([k, l]) => (
                <button key={k} className="qr-tab" data-active={tab === k} data-testid={'tab-' + k} onClick={() => setTab(k)}>{l}</button>))}
            </div>
            <div className="qr-scroll">
              {part && tab === 'drawing' && <DrawingView part={part} focus={focus} />}
              {part && tab === 'route' && <RouteCard part={part} />}
              {part && tab === 'model' && <ModelView part={part} />}
              {part && tab === 'data' && <DataView part={part} />}
            </div>
          </div>
          {part && <ProblemsPanel part={part} onFocus={(loc: any) => { setTab('drawing'); setFocus(loc); }} updatePart={updatePart} />}
        </div>
      )}
      {busy && <div className="qr-busy" data-testid="busy"><div>{busy.text}</div>{busy.progress != null && <div className="qr-bar"><div style={{ width: Math.round(busy.progress * 100) + '%' }} /></div>}</div>}
      {dialog === 'settings' && settings && <SettingsDialog settings={settings} onClose={() => setDialog(null)} onSave={async (s: any) => { setSettings(await qr().setSettings(s)); setDialog(null); }} />}
      {dialog === 'questions' && <QuestionsDialog parts={parts} lang0={settings?.questionsLanguage || 'he'} onClose={() => setDialog(null)} />}
      {dialog === 'summary' && <SummaryDialog parts={parts} onClose={() => setDialog(null)} />}
    </div>
  );
}

function PartsPanel({ parts, sel, setSel, unknown }: any) {
  return <div className="qr-panel" data-testid="parts-panel">
    <div className="qr-panel-h">Parts <span className="qr-muted">({parts.length})</span></div>
    <div className="qr-scroll">
      {parts.map((p: Part, i: number) => {
        const b = p.problems.filter((x: any) => x.severity === 'Blocker' && x.status !== 'resolved').length;
        const q = p.problems.filter((x: any) => x.severity === 'Question' && x.status !== 'resolved').length;
        const t = p.tasks.filter((x: any) => x.status !== 'done').length;
        return <div key={p.id} className="qr-part" data-active={i === sel} onClick={() => setSel(i)} data-testid="part-item">
          <div className="qr-row"><span className="pn">{p.partNo || p.drawing.name}</span><span className="qr-muted">rev {p.rev || '-'}</span><span style={{ flex: 1 }} /><Chip t="neutral">{p.customer}</Chip></div>
          <div className="qr-muted" style={{ margin: '2px 0 4px', fontSize: 12 }}>{p.title}</div>
          <div className="qr-row" style={{ marginBottom: 4 }}>
            {p.status === 'accepted' ? <Chip t="ready">Accepted</Chip> : <Chip t="danger">Rejected</Chip>}
            <span style={{ fontSize: 12 }}>{p.material?.normalized || 'Material: not found'}</span>
          </div>
          {p.status === 'rejected' && <div style={{ color: '#991b1b', fontSize: 12, marginBottom: 4 }}>{p.rejectReason}</div>}
          <div className="qr-row">
            <Chip t={readinessTone(p.readiness)}>{p.readiness}</Chip>
            {b > 0 && <Chip t="danger">{b} blocker</Chip>}{q > 0 && <Chip t="attention">{q} question</Chip>}{t > 0 && <Chip t="info">{t} task</Chip>}
            <Chip t={p.textMode === 'Text' ? 'neutral' : 'info'}>{p.textMode === 'Text' ? 'Text PDF' : p.textMode === 'OCR' ? 'OCR' : 'Text + OCR'}</Chip>
          </div>
        </div>;
      })}
      {unknown.length > 0 && <div className="qr-part qr-muted">Other documents (not drawings): {unknown.join(', ')}</div>}
    </div>
  </div>;
}

function DrawingView({ part, focus }: any) {
  const [page, setPage] = useState(focus?.page || 1);
  const [img, setImg] = useState<any>(null);
  const [showOcr, setShowOcr] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus?.page) setPage(focus.page); }, [focus]);
  useEffect(() => { let live = true; setImg(null); qr().preview(part.drawing.path, page, 2600).then((r: any) => live && setImg(r)); return () => { live = false; }; }, [part.drawing.path, page]);
  const pg = part.drawing.pages.find((p: any) => p.n === page) || part.drawing.pages[0];
  const W = 1500; // displayed width
  const k = img ? W / img.width : 1;
  useEffect(() => { if (img && focus && ref.current) { const el = ref.current.querySelector('[data-kind="focus"]') as HTMLElement; el?.scrollIntoView({ block: 'center', inline: 'center' }); } }, [img, focus]);
  const marks = part.problems.filter((p: any) => p.loc && p.loc.page === page);
  const ocrWords = showOcr && pg?.ocr ? pg.ocr.words : [];
  return <div>
    <div className="qr-row" style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
      <b>{part.drawing.name}</b>
      {part.drawing.pages.map((p: any) => <button key={p.n} className={MRT_ACTION_BTN} data-active={p.n === page} onClick={() => setPage(p.n)} style={p.n === page ? { fontWeight: 700 } : {}}>Sheet {p.n}</button>)}
      <span className="qr-muted">Text: {pg?.quality?.mode}{pg?.quality?.reasons?.length ? ` (${pg.quality.reasons.join(', ')})` : ''}{pg?.ocr ? ` · OCR ${pg.ocr.dpi} DPI, ${pg.ocr.words.length} words, ${pg.ocr.seconds}s` : ''}{pg?.ocrError ? ' · OCR error: ' + pg.ocrError : ''}</span>
      <label className="qr-row" style={{ marginLeft: 'auto' }}><input type="checkbox" checked={showOcr} onChange={(e) => setShowOcr(e.target.checked)} /> OCR words</label>
    </div>
    <div ref={ref} style={{ overflow: 'auto' }}>
      {!img ? <div className="qr-muted" style={{ padding: 20 }}>Rendering…</div> :
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
      <div><b>Part</b>{part.partNo}</div><div><b>Rev</b>{part.rev || '-'}</div><div><b>Customer</b>{part.customer}</div><div><b>Material</b>{part.material?.normalized || '—'}</div>
      <div style={{ gridColumn: 'span 2' }}><b>Title</b>{part.title}</div><div><b>Route source</b>{part.routeSource}</div><div><b>Status</b>{part.readiness} · read-only preview</div>
    </div>
    <table className="qr-table">
      <thead><tr><th style={{ width: 50 }}>Step</th><th style={{ width: 120 }}>Operation</th><th>Instructions</th><th style={{ width: 170 }}>Specifications</th><th style={{ width: 110 }}>Source</th><th style={{ width: 90 }}>Flags</th></tr></thead>
      <tbody>{part.route.map((s: any, i: number) => <tr key={i} style={s.blocked ? { background: '#fff7ed' } : {}}>
        <td>{s.seq}</td><td style={{ textTransform: 'capitalize' }}>{s.type}{s.title ? <div className="qr-muted">{s.title}</div> : null}</td>
        <td>{s.items.map((it: any, j: number) => <div key={j}>{it.seq && it.seq !== s.seq ? <b>{it.seq} </b> : null}{it.text}</div>)}</td>
        <td>{(s.specRefs || []).join(', ')}</td><td>{s.source}</td>
        <td>{s.outsourced && <Chip t="info">Outsourced</Chip>} {s.blocked && <Chip t="danger">Waiting doc</Chip>}{s.moved && <Chip t="attention">Moved</Chip>}</td></tr>)}</tbody>
    </table>
    {!part.route.length && <div className="qr-muted" style={{ padding: 10 }}>No route steps found.</div>}
  </div>;
}

function ModelView({ part }: any) {
  return <div style={{ padding: 14 }}>
    <h3 style={{ marginTop: 0 }}>3D model</h3>
    {part.model ? <div className="qr-kv"><div>File</div><div>{part.model.path}</div><div>STEP file name</div><div>{part.model.fileName}</div><div>Schema</div><div>{part.model.schema}</div><div>Size</div><div>{Math.round(part.model.size / 1024)} KB</div></div>
      : <div><Chip t="attention">Model not found</Chip></div>}
    <h4>Search log</h4><ul>{(part.modelSearchLog || []).map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
    <div className="qr-muted">MVP: the model is matched and identified; a 3D viewer is not part of v0.1.</div>
  </div>;
}

function DataView({ part }: any) {
  return <div style={{ padding: 12 }}>
    <div className="qr-kv" style={{ marginBottom: 12 }}>
      <div>Material</div><div>{part.material?.normalized} <span className="qr-muted">({part.material?.source}{part.material?.raw ? `: "${part.material.raw}"` : ''}) · {part.material?.family}</span></div>
      <div>BOM source</div><div>{part.bomSource || '—'}</div><div>Parts list file</div><div>{part.partsList?.name || '—'}</div>
    </div>
    {part.zones && <><h4>Surface zone markers</h4><table className="qr-table"><thead><tr><th>Note</th><th>Text</th><th>Per sheet</th><th>Total</th></tr></thead><tbody>{part.zones.map((z: any) => <tr key={z.note}><td>{z.note}</td><td>{z.text}</td><td>{Object.entries(z.perSheet).map(([s, c]) => `sheet ${s}: ${c}`).join(', ') || '—'}</td><td>{z.total}</td></tr>)}</tbody></table></>}
    <h4>Threads</h4><table className="qr-table"><thead><tr><th>Thread</th><th>Callout</th><th>Qty</th><th>Insert</th></tr></thead><tbody>{part.threads.map((t: any, i: number) => <tr key={i}><td>{t.thread}</td><td>{t.raw}</td><td>{t.qty}</td><td>{t.insert}</td></tr>)}</tbody></table>
    {part.bom.length > 0 && <><h4>Parts list / BOM</h4><table className="qr-table"><thead><tr><th>Seq</th><th>Part no.</th><th>Catalog</th><th>Description</th><th>Qty</th></tr></thead><tbody>{part.bom.map((b: any, i: number) => <tr key={i}><td>{b.seq}</td><td>{b.partNo}</td><td>{b.catalogNo}</td><td>{b.desc}{b.alternatives?.length ? <div className="qr-muted">Alt: {b.alternatives.map((a: any) => a.partNo).join(', ')}</div> : null}</td><td>{b.qty} {b.uom}</td></tr>)}</tbody></table></>}
    <h4>Notes</h4><table className="qr-table"><tbody>{part.notes.map((n: any, i: number) => <tr key={i}><td style={{ width: 40 }}>{n.n}</td><td>{n.text}</td></tr>)}</tbody></table>
  </div>;
}

function ProblemsPanel({ part, onFocus, updatePart }: any) {
  const probs = part.problems;
  const order: any = { Blocker: 0, Question: 1, Info: 2 };
  const sorted = [...probs].sort((a, b) => order[a.severity] - order[b.severity]);
  const uploads = part.tasks.filter((t: any) => t.type === 'uploadDocument');
  const verify = part.tasks.filter((t: any) => t.type === 'verify');
  return <div className="qr-panel" data-testid="problems-panel">
    <div className="qr-panel-h">Problems <span className="qr-muted">({probs.filter((p: any) => p.severity !== 'Info').length})</span> · Tasks <span className="qr-muted">({part.tasks.filter((t: any) => t.status !== 'done').length})</span></div>
    <div className="qr-scroll">
      <div className="qr-sec">Problems</div>
      {!sorted.length && <div className="qr-prob qr-muted" data-testid="no-problems">No problems found.</div>}
      {sorted.map((p: any) => <div key={p.id} className="qr-prob" data-testid="problem" onClick={() => p.loc && onFocus({ ...p.loc, id: p.id, bbox: null })} style={p.status === 'resolved' ? { opacity: .5 } : {}}>
        <div className="qr-row"><Chip t={tone(p.severity)}>{p.severity}</Chip><b>{p.category}</b>{p.loc && <span className="qr-muted" style={{ marginLeft: 'auto' }}>sheet {p.loc.page} ⌖</span>}</div>
        <div className="msg">{p.message}</div>
        {p.suggestion && <div className="qr-muted" style={{ fontSize: 12 }}>→ {p.suggestion}</div>}
        {p.severity !== 'Info' && <div className="qr-row" style={{ marginTop: 4 }}><button className={MRT_ACTION_BTN} onClick={(e) => { e.stopPropagation(); updatePart((pt: any) => { const x = pt.problems.find((y: any) => y.id === p.id); x.status = x.status === 'resolved' ? 'open' : 'resolved'; return pt; }); }}>{p.status === 'resolved' ? 'Reopen' : 'Mark resolved'}</button></div>}
      </div>)}
      <div className="qr-sec">Documents to upload ({uploads.filter((t: any) => t.status !== 'done').length})</div>
      {uploads.map((t: any) => <div key={t.id} className="qr-prob" data-testid="task">
        <div className="qr-row"><Chip t={t.status === 'done' ? 'ready' : 'info'}>{t.status === 'done' ? 'Uploaded' : 'Upload'}</Chip><b>{t.refNumber}</b></div>
        <div className="msg">{t.title}</div><div className="qr-muted" style={{ fontSize: 12 }}>Blocks: {t.blocks}</div>
        <div className="qr-row" style={{ marginTop: 4 }}><button className={MRT_ACTION_BTN} onClick={async () => { const f = t.status === 'done' ? [] : await qr().pickFiles(); updatePart((pt: any) => { const x = pt.tasks.find((y: any) => y.id === t.id); if (x.status === 'done') { x.status = 'open'; x.file = ''; } else if (f.length) { x.status = 'done'; x.file = f[0]; } return pt; }); }}>{t.status === 'done' ? 'Undo' : 'Attach document…'}</button>{t.file && <span className="qr-muted">{t.file}</span>}</div>
      </div>)}
      {verify.length > 0 && <><div className="qr-sec">Verify OCR values ({verify.length})</div>
        {verify.map((t: any) => <div key={t.id} className="qr-prob" onClick={() => onFocus({ page: t.page, bbox: t.bbox, id: t.id })}><div className="msg">{t.title}</div></div>)}</>}
      <div className="qr-sec">References</div>
      {part.refs.map((r: any, i: number) => <div key={i} className="qr-prob" style={{ cursor: 'default' }}><div className="qr-row"><Chip t={r.kind === 'public' ? 'neutral' : r.kind === 'vendor' ? 'info' : 'attention'}>{r.kind}</Chip><b>{r.number}</b></div><div className="qr-muted" style={{ fontSize: 12 }}>{r.description}</div></div>)}
    </div>
  </div>;
}

function Modal({ title, children, footer, onClose, testid }: any) {
  return <div className="qr-modal-bg" onClick={onClose}><div className="qr-modal" onClick={(e) => e.stopPropagation()} data-testid={testid}>
    <div className="qr-modal-h">{title}<span style={{ flex: 1 }} /><button className={MRT_ACTION_BTN} onClick={onClose}>✕</button></div>
    <div className="qr-modal-b">{children}</div><div className="qr-modal-f">{footer}</div></div></div>;
}

function QuestionsDialog({ parts, lang0, onClose }: any) {
  const [lang, setLang] = useState(lang0);
  const [html, setHtml] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { qr().questionsPreview(parts, lang).then((r: any) => setHtml(r.html)); }, [lang, parts]);
  return <Modal title="Customer questions" onClose={onClose} testid="questions-dialog" footer={<>
    {msg && <span className="qr-muted" style={{ marginRight: 'auto' }}>{msg}</span>}
    <button className={MRT_BTN} onClick={onClose}>Close</button>
    <button className={MRT_BTN_PRIMARY} data-testid="export-questions" onClick={async () => { const r = await qr().exportQuestions(parts, lang); if (r) { setMsg('Saved ' + r.pdf); qr().openPath(r.pdf); } }}>Export PDF + TXT</button></>}>
    <div className="qr-row" style={{ marginBottom: 8 }}>Language:
      <button className={lang === 'he' ? MRT_BTN_PRIMARY : MRT_BTN} data-testid="lang-he" onClick={() => setLang('he')}>עברית (Hebrew)</button>
      <button className={lang === 'en' ? MRT_BTN_PRIMARY : MRT_BTN} data-testid="lang-en" onClick={() => setLang('en')}>English</button></div>
    <iframe title="questions" srcDoc={html} style={{ width: '100%', height: '62vh', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }} />
  </Modal>;
}

function SummaryDialog({ parts, onClose }: any) {
  const [msg, setMsg] = useState('');
  return <Modal title="Order summary" onClose={onClose} testid="summary-dialog" footer={<>
    {msg && <span className="qr-muted" style={{ marginRight: 'auto' }}>{msg}</span>}
    <button className={MRT_BTN} onClick={async () => { const r = await qr().exportSummary(parts, 'csv'); if (r) setMsg('Saved ' + r.path); }}>Export CSV</button>
    <button className={MRT_BTN_PRIMARY} onClick={async () => { const r = await qr().exportSummary(parts, 'pdf'); if (r) setMsg('Saved ' + r.path); }}>Export PDF</button></>}>
    <table className="qr-table"><thead><tr><th>Part</th><th>Rev</th><th>Customer</th><th>Material</th><th>Status</th><th>Readiness</th><th>Blockers</th><th>Questions</th><th>Tasks</th><th>Model</th></tr></thead>
      <tbody>{parts.map((p: Part) => <tr key={p.id}><td>{p.partNo}</td><td>{p.rev}</td><td>{p.customer}</td><td>{p.material?.normalized}</td><td>{p.status === 'accepted' ? <Chip t="ready">Accepted</Chip> : <Chip t="danger">Rejected</Chip>}</td><td>{p.readiness}</td>
        <td>{p.problems.filter((x: any) => x.severity === 'Blocker').length}</td><td>{p.problems.filter((x: any) => x.severity === 'Question').length}</td><td>{p.tasks.filter((t: any) => t.status !== 'done').length}</td><td>{p.model ? 'found' : '—'}</td></tr>)}</tbody></table>
  </Modal>;
}

function SettingsDialog({ settings, onClose, onSave }: any) {
  const [s, setS] = useState<any>(structuredClone(settings));
  const set = (k: string, v: any) => setS((o: any) => ({ ...o, [k]: v }));
  return <Modal title="Settings" onClose={onClose} testid="settings-dialog" footer={<><button className={MRT_BTN} onClick={onClose}>Cancel</button><button className={MRT_BTN_PRIMARY} data-testid="settings-save" onClick={() => onSave(s)}>Save</button></>}>
    <div className="qr-field"><label>Text size</label><select className="qr-input" value={s.textSize} data-testid="text-size" onChange={(e) => { set('textSize', e.target.value); qr().applyZoom(e.target.value); }}><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">X-Large</option></select></div>
    <div className="qr-field"><label>Customer questions language</label><select className="qr-input" value={s.questionsLanguage} onChange={(e) => set('questionsLanguage', e.target.value)}><option value="he">Hebrew (default)</option><option value="en">English</option></select></div>
    <div className="qr-field"><label>OCR for scanned / outlined text</label><label className="qr-row"><input type="checkbox" checked={s.ocr !== false} onChange={(e) => set('ocr', e.target.checked)} /> Run OCR (offline Tesseract)</label></div>
    <div className="qr-field"><label>OCR resolution (DPI)</label><select className="qr-input" value={s.ocrDpi} onChange={(e) => set('ocrDpi', +e.target.value)}>{[400, 500, 600].map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
    <div className="qr-field"><label>Company folder</label><div className="qr-row"><input className="qr-input" style={{ flex: 1 }} value={s.companyFolder} onChange={(e) => set('companyFolder', e.target.value)} /><button className={MRT_ACTION_BTN} onClick={async () => { const f = await qr().pickFolder(); if (f) set('companyFolder', f); }}>Browse…</button></div></div>
    <div className="qr-field"><label>Model search roots (read-only)</label><textarea className="qr-input" rows={3} value={(s.searchRoots || []).join('\n')} onChange={(e) => set('searchRoots', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></div>
    <h4>Materials we work with</h4>
    <table className="qr-table"><thead><tr><th style={{ width: 60 }}>Use</th><th style={{ width: 160 }}>Family</th><th>Match pattern</th></tr></thead><tbody>
      {s.materials.map((m: any, i: number) => <tr key={i}><td><input type="checkbox" checked={m.enabled !== false} onChange={(e) => { const ms = [...s.materials]; ms[i] = { ...m, enabled: e.target.checked }; set('materials', ms); }} /></td><td>{m.family}</td><td><code style={{ fontSize: 11 }}>{m.re}</code></td></tr>)}
    </tbody></table>
  </Modal>;
}
