import React, { useEffect, useRef, useState } from 'react';
import { MRT_BTN, MRT_BTN_PRIMARY, MRT_ACTION_BTN } from '../ui/mrtButtons';
import { Modal } from '../ui/common';
import CatalogTable from './CatalogTable';
import CustomersTab from './CustomersTab';
import { t } from '../i18n';
import { ACCENTS, DENSITIES, ROW_HEIGHTS, themeAttrs } from '../theme/themes';
import PresetsPanel from './PresetsPanel';
import { AppVersion } from '../about/AppVersion';
import LanguagePanel from './LanguagePanel';
import WatchVideo from '../video/WatchVideo';

function QuestionSample({ lang }: { lang: string }) {
  const [t, setT] = useState('');
  useEffect(() => { window.qr.questionSample(lang).then(setT); }, [lang]);
  return <div className="qr-sample" dir={lang === 'he' ? 'rtl' : 'ltr'} data-testid="question-sample">{t}</div>;
}

const TABS = ['interface', 'general', 'language', 'ocr', 'materials', 'processes', 'customers', 'outlook', 'folders', 'assistant'] as const;
type Tab = typeof TABS[number];

function Field({ label, children }: any) { return <div className="qr-field"><label>{label}</label><div>{children}</div></div>; }
function FolderInput({ value, onChange, testid }: any) {
  return <div className="qr-row"><input className="qr-input" style={{ flex: 1 }} value={value || ''} data-testid={testid} onChange={(e) => onChange(e.target.value)} />
    <button className={MRT_ACTION_BTN} title={t('tip.browse')} onClick={async () => { const f = await window.qr.pickFolder(); if (f) onChange(f); }}>{t('st.browse')}</button></div>;
}

const LIVE = ['uiLanguage', 'assistantLanguage', 'textSize', 'palette', 'accent', 'density', 'rowHeight'];
export default function SettingsDialog({ settings, onClose, onSave, onApplyPreset, onRestartTour, initialTab }: any) {
  const [s, setS] = useState<any>(structuredClone(settings));
  const orig = useRef<any>(structuredClone(settings)); // the saved values: __qrSetSettings mutates the `settings` prop while previewing, so Cancel restores from this copy
  const [prev, setPrev] = useState<string>(settings.palette); // previewed preset (live); s.palette is the committed one
  const [tab, setTab] = useState<Tab>(initialTab || 'interface');
  const set = (k: string, v: any) => setS((o: any) => ({ ...o, [k]: v }));
  // live preview of language / size; restored on Cancel
  const live = (k: string, v: any) => { set(k, v); (window as any).__qrSetSettings?.({ [k]: v }); };
  const cancel = () => { (window as any).__qrSetSettings?.(Object.fromEntries(LIVE.map((k) => [k, orig.current[k]]))); onClose(); };
  (window as any).__qrSettingsTab = setTab;
  return <Modal title={t('st.title')} wide onClose={cancel} testid="settings-dialog" footer={<><button className={MRT_BTN} title={t('tip.cancel')} onClick={cancel}>{t('st.cancel')}</button><button className={MRT_BTN_PRIMARY} data-testid="settings-save" title={t('tip.save')} onClick={() => onSave(s)}>{t('st.save')}</button></>}>
    <div className="qr-settings">
      <div className="qr-settings-nav">{TABS.map((k) => <button key={k} className="qr-settings-tab" data-active={tab === k} data-testid={'stab-' + k} title={t('tip.tab')} onClick={() => setTab(k)}>{t('st.tab.' + k)}</button>)}<div className="qr-settings-about" data-testid="settings-about"><span>{t('about.title')}</span> <AppVersion className="qr-ver qr-ver-about" /></div></div>
      <div className="qr-settings-body">
        {tab === 'interface' && <>
          <PresetsPanel committed={s.palette} previewed={prev} onPreview={(id: string) => { setPrev(id); (window as any).__qrSetSettings?.({ palette: id }); }} onApply={() => { const n = { ...s, palette: prev }; setS(n); orig.current = structuredClone(n); onApplyPreset?.(n); }} />
          <h3 className="qr-pres-title qr-fine">{t('st.fineTune')}</h3>
          <Field label={t('st.ifaceAccent')}><div className="qr-accs" role="radiogroup" aria-label={t('st.ifaceAccent')} data-testid="accents">{ACCENTS.map((id) => <button key={id} type="button" role="radio" aria-checked={s.accent === id} className="qr-acc" data-active={s.accent === id} data-acc={id} data-testid={'acc-' + id} title={t('tip.accent')} onClick={() => live('accent', id)}><span className="qr-acc-sw" {...themeAttrs({ palette: prev, accent: id })} aria-hidden />{t('acc.' + id)}</button>)}</div></Field>
          <Field label={t('st.textSize')}><select className="qr-input" value={s.textSize} data-testid="text-size" onChange={(e) => live('textSize', e.target.value)}>{['normal', 'large', 'xlarge', 'huge'].map((k) => <option key={k} value={k}>{t('size.' + k)}</option>)}</select></Field>
          <Field label={t('st.ifaceDensity')}><select className="qr-input" value={s.density} data-testid="density" onChange={(e) => live('density', e.target.value)}>{DENSITIES.map((k) => <option key={k} value={k}>{t('den.' + k)}</option>)}</select></Field>
          <Field label={t('st.ifaceRows')}><select className="qr-input" value={s.rowHeight} data-testid="row-height" onChange={(e) => live('rowHeight', e.target.value)}>{ROW_HEIGHTS.map((k) => <option key={k} value={k}>{t('row.' + k)}</option>)}</select></Field>
        </>}
        {tab === 'general' && <>
          <Field label={t('st.qLang')}><select className="qr-input" value={s.questionsLanguage} data-testid="questions-lang" onChange={(e) => set('questionsLanguage', e.target.value)}><option value="he">{t('st.heDefault')}</option><option value="en">{t('st.english')}</option></select><QuestionSample lang={s.questionsLanguage} /></Field>
        </>}
        {tab === 'language' && <LanguagePanel value={s.uiLanguage} onPick={(l: string) => live('uiLanguage', l)} />}
        {tab === 'ocr' && <>
          <Field label={t('st.tab.ocr')}><label className="qr-row"><input type="checkbox" checked={s.ocr !== false} onChange={(e) => set('ocr', e.target.checked)} /> {t('st.ocrOn')}</label></Field>
          <Field label={t('st.resolution')}><select className="qr-input" value={s.ocrDpi} onChange={(e) => set('ocrDpi', +e.target.value)}>{[400, 500, 600].map((d) => <option key={d} value={d}>{d} DPI</option>)}</select></Field>
          <Field label={t('st.ocrLang')}><span>English</span></Field>
        </>}
        {tab === 'materials' && <CatalogTable kind="materials" rows={s.materialsCatalog} onChange={(r) => set('materialsCatalog', r)} />}
        {tab === 'processes' && <CatalogTable kind="processes" rows={s.processesCatalog} onChange={(r) => set('processesCatalog', r)} />}
        {tab === 'customers' && <CustomersTab rows={s.customers} onChange={(r) => set('customers', r)} />}
        {tab === 'outlook' && <>
          <Field label={t('st.outlookDrag')}><label className="qr-row"><input type="checkbox" checked={s.outlookDrag !== false} onChange={(e) => set('outlookDrag', e.target.checked)} /> {t('st.outlookTake')}</label></Field>
          <Field label={t('st.outlookSave')}><FolderInput value={s.outlookSaveFolder} onChange={(v: string) => set('outlookSaveFolder', v)} /></Field>
        </>}
        {tab === 'folders' && <>
          <Field label={t('st.company')}><FolderInput value={s.companyFolder} onChange={(v: string) => set('companyFolder', v)} /></Field>
          <Field label={t('st.export')}><FolderInput value={s.exportFolder} onChange={(v: string) => set('exportFolder', v)} /></Field>
          <Field label={t('st.roots')}><textarea className="qr-input" style={{ width: '100%' }} rows={4} value={(s.searchRoots || []).join('\n')} onChange={(e) => set('searchRoots', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></Field>
        </>}
        {tab === 'assistant' && <>
          <Field label={t('st.assistLang')}><select className="qr-input" value={s.assistantLanguage} data-testid="assistant-lang" onChange={(e) => live('assistantLanguage', e.target.value)}><option value="he">עברית</option><option value="en">English</option><option value="ru">Русский</option></select><div className="qr-muted" data-testid="assistant-lang-note">{t('st.assistLangNote')}</div></Field>
          <Field label={t('st.tab.assistant')}><label className="qr-row"><input type="checkbox" data-testid="assistant-on" checked={s.assistant !== false} onChange={(e) => set('assistant', e.target.checked)} /> {t('st.assistantOn')}</label></Field>
          <Field label={t('st.restartTour')}><button type="button" className={MRT_ACTION_BTN} data-testid="restart-tour" title={t('tip.restartTour')} onClick={() => onRestartTour?.(s)}>{t('st.restartTour')}</button></Field>
      <Field label={t('st.watchVideo')}><WatchVideo lang={s.assistantLanguage} testid="settings-watch-video" label={t('video.watch')} tip={t('tip.watchVideo')} noTip={t('dis.noVideo')} /></Field>
        </>}
      </div>
    </div>
  </Modal>;
}
