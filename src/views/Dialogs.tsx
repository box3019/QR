// Questions letter and all-parts report dialogs (opened on demand from step 4).
import React, { useEffect, useState } from 'react';
import { t, tReadiness, getLang } from '../i18n';
import { Modal } from '../ui/common';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../ui/mrtButtons';
import { PlainStatusBadge } from '../ui/simple';
const qr = () => (window as any).qr;
type Part = any;
const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');

export function QuestionsDialog({ parts, lang0, onClose }: any) {
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

export function SummaryDialog({ parts, onClose }: any) {
  const [msg, setMsg] = useState('');
  return <Modal title={t('sum.title')} onClose={onClose} testid="summary-dialog" footer={<>
    {msg && <span className="qr-muted" style={{ marginInlineEnd: 'auto' }}>{msg}</span>}
    <button className={MRT_BTN} title={t('tip.csv')} onClick={async () => { const r = await qr().exportSummary(parts, 'csv'); if (r) setMsg(t('q.saved', { path: r.path })); }}>{t('sum.csv')}</button>
    <button className={MRT_BTN_PRIMARY} title={t('tip.pdf')} onClick={async () => { const r = await qr().exportSummary(parts, 'pdf'); if (r) setMsg(t('q.saved', { path: r.path })); }}>{t('sum.pdf')}</button></>}>
    <table className="qr-table"><thead><tr><th>{t('rc.part')}</th><th>{t('rc.rev')}</th><th>{t('rc.customer')}</th><th>{t('rc.material')}</th><th>{t('rc.status')}</th><th>{t('sum.readiness')}</th><th>{t('sum.blockers')}</th><th>{t('sum.questions')}</th><th>{t('sum.tasks')}</th><th>{t('sum.model')}</th></tr></thead>
      <tbody>{parts.map((p: Part) => <tr key={p.id}><td>{p.partNo}</td><td>{p.rev}</td><td>{p.customer}</td><td>{L(p.material, 'line') || L(p.material, 'normalized')}</td><td><PlainStatusBadge part={p} /></td><td>{tReadiness(p.readiness)}</td>
        <td>{p.problems.filter((x: any) => x.severity === 'Blocker').length}</td><td>{p.problems.filter((x: any) => x.severity === 'Question').length}</td><td>{p.tasks.filter((x: any) => x.status !== 'done').length}</td><td>{p.model ? t('sum.found') : '—'}</td></tr>)}</tbody></table>
  </Modal>;
}
