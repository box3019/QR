// One project (tab): its own wizard step, parts, problems, viewer and background run; saves itself and reports its tab meta.
import { setCkSettings } from './checklist/store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t, getLang } from './i18n';
import { StepHeader } from './components/wizard/StepHeader';
import { StepIntake } from './components/wizard/StepIntake';
import { StepCheckParts } from './components/wizard/StepCheckParts';
import { StepDocsQuestions } from './components/wizard/StepDocsQuestions';
import { StepSummary } from './components/wizard/StepSummary';
import { ProgressToast } from './components/wizard/ProgressToast';
import { WizardRail } from './components/wizard/WizardRail';
import { WizardFooter } from './components/wizard/WizardFooter';
import { DropChoice } from './components/wizard/DropChoice';
import { QuestionsDialog, SummaryDialog } from './views/Dialogs';
import { hintFor } from './wizard/hints.mjs';
import { nextAction } from './wizard/nextstep.mjs';
import { openQuestions } from './wizard/summary.mjs';
import { afterImport } from './wizard/importView.mjs';
import { dropPlan } from './wizard/dropGuard.mjs';
import { tabMeta, persisted } from './projects/store.mjs';
import { noPartsReason } from './projects/notice.mjs';
import { useHistoryTouch } from './projects/useHistory';
import { useBusy } from './hooks/useBusy';
import { exposeTestHooks } from './hooks/testHooks';

const qr = () => (window as any).qr;
type Part = any;
function reportLang(settings: any) { return (settings && settings.uiLanguage) === 'he' || getLang() === 'he' ? 'he' : 'en'; }
function afterPdf(notify: any, r: any, each?: boolean, counts?: any) {
  if (!r || r.canceled) return;
  if (r.ok === false) { notify(r.error === 'Print document rendered empty' ? t('print.empty') : t('pdf.failed', { text: r.error || '' })); return; }
  const path = each ? (r.files && r.files[0]) : r.path;
  const vars = each ? { n: (r.files || []).length, path: r.dir, checked: counts?.checked ?? (r.files || []).length, suitable: counts?.suitable ?? 0, all: counts?.all ?? 0 } : { path: r.path };
  notify({ text: t(each ? 'pdf.savedEach' : 'pdf.saved', vars), action: { label: t('pdf.openFolder'), run: () => { qr().openPath(path); } } });
}
export function ProjectView({ id, active, initial, pending, settings, assistant, details, setDetails, notify, over, onMeta, register, recent, onReopen, onHistory, onClearHistory, onCloseJob }: any) {
  setCkSettings(settings); // the checklist thresholds (Settings > Precision) for the screens below
  const I = initial || {};
  const [parts, setParts] = useState((I.parts || []) as Part[]); const [unknown, setUnknown] = useState((I.unknown || []) as string[]);
  const [partOpen, setPartOpen] = useState(false); const [sel, setSel] = useState(I.sel || 0); const [step, setStep] = useState(I.step || 1); const [tab, setTab] = useState(I.tab || 'drawing');
  const [dialog, setDialog] = useState(null as null | 'questions' | 'summary'); const [focus, setFocus] = useState(null as any);
  const [lastRun, setLastRun] = useState(I.lastRun || null); const [rfqs, setRfqs] = useState((I.rfqs || []) as any[]); const [dirty, setDirty] = useState(!!I.dirty); const [savedAt, setSavedAt] = useState((I.savedAt || null) as string | null);
  const { busy, view, start, stop, clear } = useBusy(id, (p) => setParts((ps) => {
    const k = (p && p.drawing && p.drawing.path) || p.id;
    if (k && ps.some((x: any) => ((x.drawing && x.drawing.path) || x.id) === k)) return ps;
    return [...ps, p];
  }));
  const partsRef = useRef(parts); partsRef.current = parts; const queue = useRef(Promise.resolve() as Promise<any>);
  const rfqsRef = useRef(rfqs); rfqsRef.current = rfqs; const [ask, setAsk] = useState(null as any);
  const pick = (i: number) => { setSel(i); setFocus(null); };
  const stepTo = (n: number) => { setStep(n); setPartOpen(false); };
  const openPart = (i: number, s: number) => { pick(i); setStep(s); setPartOpen(true); };
  const reset = () => { clear(); setParts([]); setRfqs([]); setUnknown([]); setLastRun(null); setSel(0); setFocus(null); setStep(1); setPartOpen(false); setDirty(false); };
  // a drop while something is loaded or loading is added to it (queued); another RFQ asks Add to current / Start new
  const runOne = async (paths: string[]) => {
    const prev = partsRef.current; let append = prev.length > 0; start(append);
    try { const r = await qr().process(paths, id);
      if (append && dropPlan(true, rfqsRef.current, r.rfqs) === 'ask') append = (await new Promise<'append' | 'new'>((res) => setAsk(() => res))) === 'append';
      setAsk(null); if (!(r.parts || []).length && notify) { const w = noPartsReason(r); notify({ code: w.key, vars: w.vars }); }
      const all = append ? [...prev, ...r.parts] : r.parts; if (!append) { setSel(0); setFocus(null); } setParts(all); setUnknown((u) => [...(append ? u : []), ...(r.unknown || []), ...(r.other || [])]);
      setRfqs((x) => [...(append ? x : []), ...(r.rfqs || [])]); setLastRun((l: any) => ({ seconds: r.seconds, files: [...(append && l ? l.files : []), ...r.files] }));
      if (all.length) { setStep((s: number) => afterImport(s, all.length)); setTab('drawing'); } }
    catch (e: any) { alert(t('err.processing', { text: e?.message || e })); }
    finally { stop(); }
  };
  const run = useCallback((paths: string[]) => { if (!paths || !paths.length) return; queue.current = queue.current.then(() => runOne(paths)); return queue.current; }, []);
  // Save now (also what autosave calls): writes the project and stamps the time shown as 'Saved hh:mm'; never while a run is still adding parts.
  const snapRef = useRef(null as any); const busyRef = useRef(false); busyRef.current = !!busy; const savedRef = useRef(savedAt); savedRef.current = savedAt;
  snapRef.current = persisted({ step, parts, rfqs, unknown, lastRun, sel, tab, dirty });
  const changeRev = useRef(0); const firstChange = useRef(true); const [unsaved, setUnsaved] = useState(false);
  useEffect(() => { if (firstChange.current) { firstChange.current = false; return; } changeRev.current++; setUnsaved(true); }, [parts, rfqs, unknown, lastRun]); // content changed since the last save: the tab dot
  const doSave = useCallback(async () => { if (busyRef.current) return null; const rev = changeRev.current; const at = new Date().toISOString(); await qr().saveProject(id, { ...snapRef.current, savedAt: at }); setSavedAt(at); if (changeRev.current === rev) setUnsaved(false); return at; }, []);
  useEffect(() => { register(id, run, { save: doSave, snapshot: () => ({ ...snapRef.current, savedAt: savedRef.current }) }); if (pending && pending.length) run(pending); }, []);
  useEffect(() => { if (busy) return; const h = setTimeout(() => doSave().catch(() => {}), 500); return () => clearTimeout(h); }, [busy, step, parts, rfqs, unknown, lastRun, sel, tab, dirty]);
  useEffect(() => { onMeta(id, tabMeta({ parts, rfqs, busy, view, step, lastRun, dirty, unsaved, savedAt })); }, [parts, rfqs, busy, view, step, lastRun, dirty, unsaved, savedAt]);
  useHistoryTouch(id, active, busy, parts, rfqs, step, onHistory);
  if (active) {
    exposeTestHooks({ setDetails, setStep: stepTo, run, parts, rfqs, unknown, setDialog, select: (i: number, tb?: any) => { setSel(i); setPartOpen(true); if (tb) { setTab(tb); setStep(2); } } });
    (window as any).__qrPrintPayload = () => ({
      parts, step, sel, partOpen,
      lang: reportLang(settings), meta: tabMeta({ parts, rfqs }),
      mode: step === 2 && !partOpen ? 'package' : (partOpen && (step === 2 || step === 3) ? 'part' : undefined),
    });
  }
  const has = parts.length > 0;
  const updatePart = (fn: (p: Part) => Part) => { setDirty(true); setParts((ps) => ps.map((p, i) => (i === sel ? fn(structuredClone(p)) : p))); };

  const hint = hintFor(step, { hasParts: has, nParts: parts.length, busy: !!busy, nQuestions: parts.reduce((n, p) => n + openQuestions(p), 0) });
  const nextLine = nextAction(step, parts, !!busy);
  const goNext = (go: any) => { if (!go) return; if (go.part != null) { pick(go.part); setPartOpen(true); } else setPartOpen(false); if (go.step) setStep(go.step); if (go.action === 'files') qr().pickFiles().then((f: string[]) => run(f)); if (go.action === 'export') setTimeout(() => (document.querySelector('[data-testid=btn-export-xlsx-all]') as HTMLElement | null)?.click(), 0); };
  // Cancel clears the RFQ without a question: a toast offers Undo instead (nothing is lost)
  const clearAll = () => { const snap = { parts, rfqs, unknown, lastRun, sel, step }; reset(); notify({ code: 'cleared', undo: () => { setParts(snap.parts); setRfqs(snap.rfqs); setUnknown(snap.unknown); setLastRun(snap.lastRun); setSel(snap.sel); setStep(snap.step); setDirty(false); } }); };
  return <div className={'qr-proj' + (active ? '' : ' qr-proj-off')} data-testid="project" data-id={id} data-step={step} data-provisional={!!busy && has} aria-hidden={!active}>
    <div className="qr-wiz mrt-wizard-shell">
      <WizardRail step={step} setStep={stepTo} hasParts={has} rfqs={rfqs} parts={parts} files={lastRun?.files || []} sel={sel} settings={settings}
        onOpenDrawing={() => { if (!has) return; pick(sel); setPartOpen(true); setStep(2); setTab('drawing'); }}
        onOpenChecklist={() => { if (has) stepTo(4); }} />
      <StepHeader step={step} hint={hint} assistant={assistant} next={nextLine} onGo={goNext} />
      {!!busy && has && step > 1 && <div className="qr-provisional" data-testid="provisional" role="status">{t('prov.note')}</div>}
      <main className="qr-wiz-main">
        {step === 1 && <StepIntake view={view} parts={parts} files={lastRun?.files || []} onNext={() => stepTo(2)} onPart={(i: number) => openPart(i, 2)} nParts={parts.length} rfqs={rfqs} over={over} details={details} unknown={unknown} recent={recent} onReopen={onReopen} onClearHistory={onClearHistory} onFiles={async () => run(await qr().pickFiles())} onFolder={async () => { const f = await qr().pickFolder({ zip: true }); if (f) run([f]); }} />}
        {step === 2 && has && <StepCheckParts parts={parts} sel={sel} open={partOpen} onOpen={(i: number) => openPart(i, 2)} onBack={() => setPartOpen(false)} onGo={pick} onLeave={() => stepTo(3)} rtl={getLang() === 'he'} unknown={unknown} details={details} tab={tab} setTab={setTab} focus={focus} setFocus={setFocus} setStep={stepTo}
          onPatch={(i: number, next: any) => { setDirty(true); setParts((ps) => ps.map((p, j) => (j === i ? next : p))); }}
          onPatchAll={(next: any[]) => { setDirty(true); setParts(next); }}
          files={lastRun?.files || []}
          onPrinted={(r: any) => { if (!r) return; if (r.ok === false) notify(r.error || t('print.failed')); else notify(t('print.drawingsDone', { n: r.printed })); }}
          onPrint={(i: number) => qr().print({ parts, step: 2, sel: i, partOpen: true, mode: 'part', lang: reportLang(settings), meta: tabMeta({ parts, rfqs }) }).then((r: any) => { if (r && r.ok === false) notify(r.error === 'Print document rendered empty' ? t('print.empty') : (r.error || t('print.failed'))); })}
          onSave={(i: number) => qr().savePdf({ parts, step: 2, sel: i, partOpen: true, mode: 'part', lang: reportLang(settings), meta: tabMeta({ parts, rfqs }) }).then((r: any) => afterPdf(notify, r))}
          onPrintPack={() => qr().print({ parts, step, sel, partOpen: false, mode: 'package', lang: reportLang(settings), meta: tabMeta({ parts, rfqs }) }).then((r: any) => { if (r && r.ok === false) notify(r.error === 'Print document rendered empty' ? t('print.empty') : (r.error || t('print.failed'))); })}
          onSavePack={() => qr().savePdf({ parts, step, sel, partOpen: false, mode: 'package', lang: reportLang(settings), meta: tabMeta({ parts, rfqs }) }).then((r: any) => afterPdf(notify, r))}
          onSaveEach={(indexes: number[], counts: any) => qr().savePdfEach({ parts, indexes, lang: reportLang(settings), meta: tabMeta({ parts, rfqs }) }).then((r: any) => afterPdf(notify, r, true, counts))} />}
        {step === 3 && has && <StepDocsQuestions parts={parts} sel={sel} open={partOpen} onOpen={(i: number) => openPart(i, 3)} onBack={() => setPartOpen(false)} onGo={pick} onLeave={() => stepTo(4)} rtl={getLang() === 'he'} unknown={unknown} details={details} updatePart={updatePart} onFocus={(loc: any) => { setStep(2); setPartOpen(true); setTab('drawing'); setFocus(loc); }} />}
        {step === 4 && has && <StepSummary parts={parts} openDialog={(d: any) => { setDialog(d); setDirty(false); }} goPart={(i: number) => openPart(i, 2)} />}
      </main>
      <WizardFooter step={step} partOpen={partOpen} setStep={stepTo} hasParts={has} busy={!!busy} onCancel={clearAll} onClose={() => onCloseJob(id)} />
    </div>
    {active && ask && <DropChoice onChoose={(c: 'append' | 'new') => ask(c)} />}
    {active && busy && view?.active && step !== 1 && <ProgressToast busy={busy} details={details} />}
    {active && dialog === 'questions' && <QuestionsDialog parts={parts} lang0={parts.find((p: any) => p.questionsLanguage)?.questionsLanguage || settings?.questionsLanguage || 'he'} onClose={() => setDialog(null)} />}
    {active && dialog === 'summary' && <SummaryDialog parts={parts} onClose={() => setDialog(null)} />}
  </div>;
}
