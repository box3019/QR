import React, { useEffect, useState } from 'react';
import { MRT_BTN, MRT_BTN_PRIMARY, MRT_ACTION_BTN } from '../ui/mrtButtons';
import { Modal } from '../ui/common';
import CatalogTable from './CatalogTable';
import CustomersTab from './CustomersTab';
import { t, setLang, setTextSize } from '../i18n';

function QuestionSample({ lang }: { lang: string }) {
  const [t, setT] = useState('');
  useEffect(() => { window.qr.questionSample(lang).then(setT); }, [lang]);
  return <div className="qr-sample" dir={lang === 'he' ? 'rtl' : 'ltr'} data-testid="question-sample">{t}</div>;
}

const TABS = ['general', 'ocr', 'materials', 'processes', 'customers', 'outlook', 'folders', 'assistant'] as const;
type Tab = typeof TABS[number];

function Field({ label, children }: any) { return <div className="qr-field"><label>{label}</label><div>{children}</div></div>; }
function FolderInput({ value, onChange, testid }: any) {
  return <div className="qr-row"><input className="qr-input" style={{ flex: 1 }} value={value || ''} data-testid={testid} onChange={(e) => onChange(e.target.value)} />
    <button className={MRT_ACTION_BTN} title={t('tip.browse')} onClick={async () => { const f = await window.qr.pickFolder(); if (f) onChange(f); }}>{t('st.browse')}</button></div>;
}

export default function SettingsDialog({ settings, onClose, onSave, initialTab }: any) {
  const [s, setS] = useState<any>(structuredClone(settings));
  const [tab, setTab] = useState<Tab>(initialTab || 'general');
  const set = (k: string, v: any) => setS((o: any) => ({ ...o, [k]: v }));
  // live preview of language / size; restored on Cancel
  const live = (k: string, v: any) => { set(k, v); (window as any).__qrSetSettings?.({ [k]: v }); };
  const cancel = () => { (window as any).__qrSetSettings?.({ uiLanguage: settings.uiLanguage, textSize: settings.textSize }); onClose(); };
  (window as any).__qrSettingsTab = setTab;
  return <Modal title={t('st.title')} wide onClose={cancel} testid="settings-dialog" footer={<><button className={MRT_BTN} title={t('tip.cancel')} onClick={cancel}>{t('st.cancel')}</button><button className={MRT_BTN_PRIMARY} data-testid="settings-save" title={t('tip.save')} onClick={() => onSave(s)}>{t('st.save')}</button></>}>
    <div className="qr-settings">
      <div className="qr-settings-nav">{TABS.map((k) => <button key={k} className="qr-settings-tab" data-active={tab === k} data-testid={'stab-' + k} title={t('tip.tab')} onClick={() => setTab(k)}>{t('st.tab.' + k)}</button>)}</div>
      <div className="qr-settings-body">
        {tab === 'general' && <>
          <Field label={t('st.uiLang')}><select className="qr-input" value={s.uiLanguage} data-testid="ui-lang" onChange={(e) => live('uiLanguage', e.target.value)}><option value="en">English</option><option value="he">עברית</option><option value="ru">Русский</option></select>{s.uiLanguage === 'ru' && <div className="qr-muted" data-testid="ru-note">{t('st.ruNote')}</div>}</Field>
          <Field label={t('st.qLang')}><select className="qr-input" value={s.questionsLanguage} data-testid="questions-lang" onChange={(e) => set('questionsLanguage', e.target.value)}><option value="he">{t('st.heDefault')}</option><option value="en">{t('st.english')}</option></select><QuestionSample lang={s.questionsLanguage} /></Field>
          <Field label={t('st.textSize')}><select className="qr-input" value={s.textSize} data-testid="text-size" onChange={(e) => live('textSize', e.target.value)}>{['normal', 'large', 'xlarge', 'huge'].map((k) => <option key={k} value={k}>{t('size.' + k)}</option>)}</select></Field>
        </>}
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
        {tab === 'assistant' && <Field label={t('st.tab.assistant')}><label className="qr-row"><input type="checkbox" data-testid="assistant-on" checked={s.assistant !== false} onChange={(e) => set('assistant', e.target.checked)} /> {t('st.assistantOn')}</label></Field>}
      </div>
    </div>
  </Modal>;
}
