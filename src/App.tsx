import { Ico } from './components/Ico';
// QR window shell: top bar with project tabs, settings/help, and one ProjectView per open project (kept mounted so each keeps its own state).
import React, { useEffect, useRef, useState } from 'react';
import { MRT_ACTION_BTN_TOPBAR } from './ui/mrtButtons';
import SettingsDialog from './settings/SettingsDialog';
import { t, setLang, setAssistantLang, setTextSize, getLang } from './i18n';
import { themeAttrs } from './theme/themes';
import { FirstRun } from './ui/simple';
import { Tour } from './tutorial/TourView';
import { toolbarFor } from './wizard/steps.mjs';
import { useAssistant } from './hooks/useAssistant';
import { useDrop } from './hooks/useDrop';
import { useProjects } from './projects/useProjects';
import { TabsBar } from './components/tabs/TabsBar';
import { ProjectView } from './ProjectView';
import { HistoryDialog } from './components/history/HistoryDialog';
import { recent } from './projects/history.mjs';
import { hhmm, shortcutAction, splitProjectFiles, saveStatus } from './projects/store.mjs';
import { saveWhy } from './wizard/nextstep.mjs';
import { Notice } from './ui/Notice';
import { FileMenu } from './components/FileMenu';

declare global { interface Window { qr: any } }
const qr = () => window.qr;

function TopButton({ icon, label, tip, onClick, testid, active, disabled }: any) {
  return <button type="button" title={tip || label} data-active={active} disabled={disabled} className={MRT_ACTION_BTN_TOPBAR} onClick={onClick} data-testid={testid}><span className="ico" aria-hidden>{icon}</span><span>{label}</span></button>;
}

export default function App() {
  const [settings, setSettings] = useState<any>(null);
  const [over, setOver] = useState(false);
  const [dialog, setDialog] = useState<null | 'settings' | 'tutorial' | 'history'>(null);
  const [tourStage, setTourStage] = useState(0);
  useEffect(() => { const h = (e: any) => { setTourStage(e.detail?.stage || 0); setDialog('tutorial'); }; window.addEventListener('qr:tour', h); return () => window.removeEventListener('qr:tour', h); }, []);
  const [hist, setHist] = useState([] as any[]);
  useEffect(() => { qr().listHistory?.().then(setHist).catch(() => {}); }, []);
  const [details, setDetails] = useState(false);
  useEffect(() => { qr().getSettings().then(setSettings); }, []);
  if (settings) { setLang(settings.uiLanguage); setAssistantLang(settings.assistantLanguage); setTextSize(settings.textSize); }
  (window as any).__qrSetSettings = (patch: any) => setSettings((o: any) => ({ ...o, ...patch }));
  const [notice, setNotice] = useState('');
  const [undoBox, setUndo] = useState(null as null | { fn: () => void });
  const notify = (n: any) => { setUndo(n && n.undo ? { fn: n.undo } : null); setNotice(typeof n === 'string' ? n : t('notice.' + n.code, n.vars || n)); };
  useEffect(() => qr().onNotify ? qr().onNotify((n: any) => notify(n)) : undefined, []);
  const P = useProjects(notify);
  useEffect(() => qr().onImport ? qr().onImport((files: string[]) => P.importOutlook(files)) : undefined, []); // Outlook 'Send to QR': new tab, or the tab of the same RFQ
  const Pr = useRef(P); Pr.current = P; const dlgRef = useRef(dialog); dlgRef.current = dialog;
  useEffect(() => { const h = (e: KeyboardEvent) => { const a = shortcutAction(e); if (!a || (dlgRef.current && a !== 'save')) return; e.preventDefault(); const p = Pr.current;
    if (a === 'save') p.save(); else if (a === 'saveAs') p.saveAs(); else if (a === 'close') p.close(p.active); else p.openProject(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  // drops go into the current tab; a dropped .qrproj opens as a project
  const drop = useDrop((paths: string[]) => { const s = splitProjectFiles(paths); s.projects.forEach((f) => P.openProject(f)); if (s.rest.length) return P.runActive(s.rest); }, settings, setOver);
  const w = window as any; w.__qrAddTab = P.add; w.__qrTabs = () => P.list.map((p) => ({ id: p.id, active: p.id === P.active, ...(P.metas[p.id] || {}) })); w.__qrSelectTab = P.setActive; w.__qrMoveTab = P.move; w.__qrHistory = () => hist; w.__qrReopen = P.reopen;
  const saveSettings = async (s: any) => setSettings(await qr().setSettings(s));
  const assistant = useAssistant(settings, saveSettings);
  const m = P.metas[P.active] || {}; const bar = toolbarFor(m.step || 1, (m.nParts || 0) > 0);
  const tabs = P.list.map((p) => ({ id: p.id, label: '', customer: '', status: 'empty', ...(P.metas[p.id] || {}) }));

  return (
    <div className="qr-root" {...themeAttrs(settings)} data-step={m.step || 1} {...drop}>
      <div className="qr-topbar mrt-workspace-topbar-chrome">
        <div className="qr-brand"><span className="qr-brand-badge">QR</span></div>
        <TabsBar tabs={tabs} active={P.active} onSelect={P.setActive} onAdd={() => P.add()} onClose={P.close} onMove={P.move} />
        {bar.details && <TopButton icon={<Ico name="details" />} label={t('top.details')} tip={t('tip.details')} testid="btn-details" active={details} onClick={() => setDetails(!details)} />}
        {bar.details && details && m.lastRun && <span className="qr-muted" data-testid="run-info">{t('top.runInfo', { parts: m.nParts, files: m.lastRun.files.length, sec: m.lastRun.seconds })}</span>}
        <FileMenu why={saveWhy(m.nParts || 0, m.status === 'busy')} status={saveStatus(m)} at={m.savedAt ? hhmm(m.savedAt) : ''} onSave={() => P.save()} onSaveAs={() => P.saveAs()} onOpen={() => P.openProject()} />
        <TopButton icon={<Ico name="history" />} label={t('top.history')} tip={t('tip.history')} testid="btn-history" onClick={() => setDialog('history')} />
        <TopButton icon={<Ico name="settings" />} label={t('top.settings')} tip={t('tip.settings')} testid="btn-settings" onClick={() => setDialog('settings')} />
        <TopButton icon={<Ico name="help" />} label={t('top.help')} tip={t('tip.help')} testid="btn-help" onClick={() => { setTourStage(0); setDialog('tutorial'); }} />
      </div>
      <div className="qr-projs">
        {P.list.map((p) => <ProjectView key={p.id} id={p.id} active={p.id === P.active} initial={p.initial} pending={p.pending} settings={settings} assistant={assistant}
          details={details} setDetails={setDetails} notify={notify} over={over && p.id === P.active} onMeta={P.setMeta} register={P.register} recent={recent(hist)} onReopen={P.reopen} onHistory={setHist} />)}
      </div>
      <div className="qr-statusbar" data-testid="status-bar" role="status">{saveStatus(m) === 'saved' && <span data-testid="saved-at" title={t('tip.savedAt', { time: hhmm(m.savedAt) })}>{t('top.saved', { time: hhmm(m.savedAt) })}</span>}{saveStatus(m) === 'unsaved' && <span data-testid="unsaved-note" title={t('tab.unsaved')}>{t('top.unsaved')}</span>}</div>
      {notice && <Notice text={notice} action={undoBox ? { label: t('notice.undo'), run: () => { undoBox.fn(); setUndo(null); setNotice(''); } } : null} onClose={() => { setNotice(''); setUndo(null); }} />}
      {dialog === 'settings' && settings && <SettingsDialog settings={settings} onClose={() => setDialog(null)} onSave={async (s: any) => { await saveSettings(s); setDialog(null); }} onApplyPreset={async (s: any) => { await saveSettings(s); }} onRestartTour={async (s: any) => { await saveSettings(s); setTourStage(0); setDialog('tutorial'); }} />}
      {settings && !settings.firstRunDone && !m.nParts && m.status !== 'busy' && <Tour first lang0={settings.assistantLanguage} onClose={async () => setSettings(await qr().setSettings({ ...settings, firstRunDone: true }))} />}
      {dialog === 'history' && <HistoryDialog items={hist} openIds={P.list.map((p) => p.id)} onClose={() => setDialog(null)} onOpen={async (id: string) => { if (await P.reopen(id)) setDialog(null); }} onRemove={async (id: string, del: boolean) => setHist(await qr().removeHistory(id, del))} />}
      {dialog === 'tutorial' && <Tour lang0={settings?.assistantLanguage || 'en'} stage={tourStage} onClose={() => { setDialog(null); setTourStage(0); }} />}
    </div>
  );
}
