import React, { useCallback, useEffect, useState } from 'react';
import { MRT_ACTION_BTN_TOPBAR } from './ui/mrtButtons';
import SettingsDialog from './settings/SettingsDialog';
import { t, setLang, setTextSize, getLang } from './i18n';
import { FirstRun } from './ui/simple';
import { Tutorial } from './tutorial/Tutorial';
import { toolbarFor } from './wizard/steps.mjs';
import { Stepper } from './components/wizard/Stepper';
import { StepHeader } from './components/wizard/StepHeader';
import { StepIntake } from './components/wizard/StepIntake';
import { StepCheckParts } from './components/wizard/StepCheckParts';
import { StepDocsQuestions } from './components/wizard/StepDocsQuestions';
import { StepSummary } from './components/wizard/StepSummary';
import { ProgressToast } from './components/wizard/ProgressToast';
import { RailContext } from './components/wizard/RailContext';
import { WizardFooter } from './components/wizard/WizardFooter';
import { useAssistant } from './hooks/useAssistant';
import { hintFor } from './wizard/hints.mjs';
import { openQuestions } from './wizard/summary.mjs';
import { useBusy } from './hooks/useBusy';
import { exposeTestHooks } from './hooks/testHooks';
import { QuestionsDialog, SummaryDialog } from './views/Dialogs';

declare global { interface Window { qr: any } }
const qr = () => window.qr;
type Part = any;


function TopButton({ icon, label, tip, onClick, testid, active }: any) {
  return <button type="button" title={tip || label} data-active={active} className={MRT_ACTION_BTN_TOPBAR} onClick={onClick} data-testid={testid}><span className="ico" aria-hidden>{icon}</span><span>{label}</span></button>;
}

export default function App() {
  const [settings, setSettings] = useState<any>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<string>('drawing');
  const [over, setOver] = useState(false);
  const [dialog, setDialog] = useState<null | 'settings' | 'questions' | 'summary' | 'tutorial'>(null);
  const [focus, setFocus] = useState<any>(null);
  const [lastRun, setLastRun] = useState<any>(null);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [details, setDetails] = useState(false);

  useEffect(() => { qr().getSettings().then(setSettings); }, []);
  if (settings) { setLang(settings.uiLanguage); setTextSize(settings.textSize); }
  (window as any).__qrSetSettings = (patch: any) => setSettings((o: any) => ({ ...o, ...patch }));
  const { busy, start, stop } = useBusy((p) => setParts((ps) => [...ps, p]));

  const reset = () => { setParts([]); setRfqs([]); setUnknown([]); setLastRun(null); setSel(0); setFocus(null); setStep(1); };
  const run = useCallback(async (paths: string[]) => {
    if (!paths.length) return;
    reset(); start();
    try { const r = await qr().process(paths); setParts(r.parts); setUnknown([...(r.unknown || []), ...(r.other || [])]); setRfqs(r.rfqs || []); setLastRun({ seconds: r.seconds, files: r.files }); if (r.parts.length) { setStep(2); setTab('drawing'); } }
    catch (e: any) { alert(t('err.processing', { text: e?.message || e })); }
    finally { stop(); }
  }, []);
  useEffect(() => qr().onImport ? qr().onImport((files: string[]) => run(files)) : undefined, [run]); // Outlook 'Send to QR'

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const paths = Array.from(e.dataTransfer.files).map((f) => qr().pathForFile(f)).filter(Boolean);
    if (paths.length) return run(paths);
    // dragged straight from Outlook: no file in the drop, take the selected e-mail(s) from Outlook
    if (settings && settings.outlookDrag === false) return;
    qr().outlookSelection().then(run).catch((x: any) => alert(String(x?.message || x)));
  };
  exposeTestHooks({ setDetails, setStep, run, parts, rfqs, unknown, setDialog, select: (i: number, tb?: any) => { setSel(i); if (tb) { setTab(tb); setStep(2); } } });
  const has = parts.length > 0;
  const bar = toolbarFor(step, has);
  const updatePart = (fn: (p: Part) => Part) => setParts((ps) => ps.map((p, i) => (i === sel ? fn(structuredClone(p)) : p)));
  const pick = (i: number) => { setSel(i); setFocus(null); };
  const saveSettings = async (s: any) => setSettings(await qr().setSettings(s));
  const assistant = useAssistant(settings, saveSettings);
  const hint = hintFor(step, { hasParts: has, nParts: parts.length, busy: !!busy, nQuestions: parts.reduce((n, p) => n + openQuestions(p), 0) });

  return (
    <div className="qr-root" data-mrt-palette="industrial-steel" data-mrt-theme="light" data-step={step}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <div className="qr-topbar mrt-workspace-topbar-chrome">
        <div className="qr-brand"><span className="qr-brand-badge">QR</span></div>
        <div style={{ flex: 1 }} />
        {bar.details && <TopButton icon="🔍" label={t('top.details')} tip={t('tip.details')} testid="btn-details" active={details} onClick={() => setDetails(!details)} />}
        {bar.details && details && lastRun && <span className="qr-muted" data-testid="run-info">{t('top.runInfo', { parts: parts.length, files: lastRun.files.length, sec: lastRun.seconds })}</span>}
        <TopButton icon="⚙" label={t('top.settings')} tip={t('tip.settings')} testid="btn-settings" onClick={() => setDialog('settings')} />
        <TopButton icon="?" label={t('top.help')} tip={t('tip.help')} testid="btn-help" onClick={() => setDialog('tutorial')} />
      </div>
      <div className="qr-wiz">
        <RailContext rfqs={rfqs} parts={parts} files={lastRun?.files || []} />
        <StepHeader step={step} hint={hint} assistant={assistant} />
        <Stepper step={step} setStep={setStep} hasParts={has} />
        <main className="qr-wiz-main">
          {step === 1 && <StepIntake rfqs={rfqs} over={over} details={details} unknown={unknown} onFiles={async () => run(await qr().pickFiles())} onFolder={async () => { const f = await qr().pickFolder(); if (f) run([f]); }} />}
          {step === 2 && has && <StepCheckParts parts={parts} sel={sel} pick={pick} unknown={unknown} details={details} tab={tab} setTab={setTab} focus={focus} setFocus={setFocus} setStep={setStep} />}
          {step === 3 && has && <StepDocsQuestions parts={parts} sel={sel} pick={pick} unknown={unknown} details={details} updatePart={updatePart} onFocus={(loc: any) => { setStep(2); setTab('drawing'); setFocus(loc); }} />}
          {step === 4 && has && <StepSummary parts={parts} openDialog={setDialog} goPart={(i: number) => { pick(i); setStep(2); }} />}
        </main>
        <WizardFooter step={step} setStep={setStep} hasParts={has} onCancel={() => confirm(t('wz.cancelAsk')) && reset()} onClose={() => window.close()} />
      </div>

      {busy && <ProgressToast busy={busy} details={details} />}
      {dialog === 'settings' && settings && <SettingsDialog settings={settings} onClose={() => setDialog(null)} onSave={async (s: any) => { await saveSettings(s); setDialog(null); }} />}
      {dialog === 'questions' && <QuestionsDialog parts={parts} lang0={parts.find((p: any) => p.questionsLanguage)?.questionsLanguage || settings?.questionsLanguage || 'he'} onClose={() => setDialog(null)} />}
      {settings && !settings.firstRunDone && !parts.length && !busy && <FirstRun onClose={async () => setSettings(await qr().setSettings({ ...settings, firstRunDone: true }))} />}
      {dialog === 'summary' && <SummaryDialog parts={parts} onClose={() => setDialog(null)} />}
      {dialog === 'tutorial' && <Tutorial lang0={getLang()} onClose={() => setDialog(null)} />}
    </div>
  );
}

