import React, { useState } from 'react';
import { MRT_ACTION_BTN } from '../ui/mrtButtons';
import { Chip } from '../ui/common';
import AliasChips from './AliasChips';
import { t } from '../i18n';

const BASES = ['RAFAEL', 'ELTA', 'KLA', 'ELBIT', 'GENERIC'];
const ROUTING = ['auto', 'routing chart', 'notes', 'notes + parts list'];
const KEYS: [string, string][] = [['emailDomains', 'pcb-technologies.com'], ['keywords', 'RAFAEL'], ['partNoPatterns', '####@###-###'], ['filenamePatterns', '*-PD-*']];

/** Customer profiles: list + editor. Built-ins can be edited/disabled, not deleted. */
export default function CustomersTab({ rows, onChange }: { rows: any[]; onChange: (r: any[]) => void }) {
  const [sel, setSel] = useState(0);
  const c = rows[sel] || rows[0];
  const upd = (patch: any) => onChange(rows.map((r, i) => (i === sel ? { ...r, ...patch } : r)));
  const updDetect = (k: string, v: string[]) => upd({ detect: { ...c.detect, [k]: v } });
  const add = async (from?: any) => { const n = await window.qr.newCustomer(from || null, rows.map((r) => r.id)); onChange([...rows, n]); setSel(rows.length); };
  return <div className="qr-cust" data-testid="customers-tab">
    <div className="qr-cust-list">
      <div className="qr-row" style={{ marginBottom: 6 }}>
        <button className={MRT_ACTION_BTN} data-testid="cust-add" title={t('tip.add')} onClick={() => add()}>{t('cu.add')}</button>
        <button className={MRT_ACTION_BTN} data-testid="cust-dup" title={t('tip.dup')} onClick={() => add(c)}>{t('cu.dup')}</button>
        {!c.builtin && <button className={MRT_ACTION_BTN} data-testid="cust-del" title={t('tip.del')} onClick={() => { onChange(rows.filter((_, i) => i !== sel)); setSel(0); }}>{t('cu.del')}</button>}
      </div>
      {rows.map((r, i) => <div key={r.id} className="qr-cust-item" data-active={i === sel} data-disabled={r.enabled === false} onClick={() => setSel(i)}>
        <b>{r.name}</b><span className="qr-muted">{r.base}</span><span style={{ flex: 1 }} />{r.builtin ? <Chip t="neutral">{t('cu.builtin')}</Chip> : <Chip t="info">{t('cu.custom')}</Chip>}{r.enabled === false && <Chip t="attention">{t('cu.off')}</Chip>}
      </div>)}
    </div>
    {c && <div className="qr-cust-edit">
      <div className="qr-field"><label>{t('cu.enabled')}</label><input type="checkbox" checked={c.enabled !== false} disabled={c.id === 'GENERIC'} onChange={(e) => upd({ enabled: e.target.checked })} /></div>
      <div className="qr-field"><label>{t('cu.name')}</label><input className="qr-input" data-testid="cust-name" value={c.name} onChange={(e) => upd({ name: e.target.value })} /></div>
      <div className="qr-field"><label>{t('cu.base')}</label><select className="qr-input" value={c.base} disabled={c.builtin} onChange={(e) => upd({ base: e.target.value })}>{BASES.map((b) => <option key={b}>{b}</option>)}</select></div>
      <div className="qr-field"><label>{t('cu.routing')}</label><select className="qr-input" value={c.routing || 'auto'} onChange={(e) => upd({ routing: e.target.value })}>{ROUTING.map((b) => <option key={b} value={b}>{t('route.' + b)}</option>)}</select></div>
      <div className="qr-field"><label>{t('cu.qLang')}</label><select className="qr-input" value={c.questionsLanguage || ''} onChange={(e) => upd({ questionsLanguage: e.target.value })}><option value="">{t('cu.default')}</option><option value="he">{t('st.hebrew')}</option><option value="en">{t('st.english')}</option></select></div>
      {KEYS.map(([k, ph]) => <div key={k} className="qr-field"><label>{t('cu.' + k)}</label><div className="qr-input" data-testid={'cust-' + k}><AliasChips value={(c.detect && c.detect[k]) || []} onChange={(v) => updDetect(k, v)} placeholder={ph} /></div></div>)}
      <div className="qr-field"><label>{t('cu.contact')}</label><input className="qr-input" dir="ltr" value={c.contact || ''} onChange={(e) => upd({ contact: e.target.value })} /></div>
      <div className="qr-field"><label>{t('cu.notes')}</label><textarea className="qr-input" rows={2} value={c.notes || ''} onChange={(e) => upd({ notes: e.target.value })} /></div>
      <div className="qr-muted">{t('cu.legend')}</div>
    </div>}
  </div>;
}
