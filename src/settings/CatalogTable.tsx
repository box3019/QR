import React, { useEffect, useState } from 'react';
import { MRT_ACTION_BTN } from '../ui/mrtButtons';
import AliasChips from './AliasChips';
import { t } from '../i18n';

type Kind = 'materials' | 'processes';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';

/** Editable capability table (materials or processes). Patterns come from core/catalog via IPC, read-only. */
export default function CatalogTable({ kind, rows, onChange }: { kind: Kind; rows: any[]; onChange: (r: any[]) => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  useEffect(() => { if (advanced) window.qr.catalogPatterns(rows).then(setPatterns); }, [advanced, rows]);
  const upd = (i: number, patch: any) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const isMat = kind === 'materials';
  const addRow = () => {
    const name = isMat ? t('cat.newMat') : t('cat.newProc');
    const id = slug(name) + '-' + Date.now().toString(36);
    onChange([...rows, isMat ? { id, family: 'Aluminium', grade: '', nameEn: name, nameHe: '', aliases: [], tempers: [], enabled: true, custom: true } : { id, nameEn: name, nameHe: '', aliases: [], options: [], enabled: true, custom: true }]);
  };
  const shown = rows.map((r, i) => [r, i] as const).filter(([r]) => !filter || JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()));
  return <div data-testid={'catalog-' + kind}>
    <div className="qr-row" style={{ marginBottom: 8 }}>
      <input className="qr-input" placeholder={t('cat.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 220 }} />
      <span className="qr-muted">{t('cat.enabled', { a: rows.filter((r) => r.enabled !== false).length, b: rows.length })}</span>
      <span style={{ flex: 1 }} />
      <label className="qr-row"><input type="checkbox" checked={advanced} data-testid={'advanced-' + kind} onChange={(e) => setAdvanced(e.target.checked)} /> {t('cat.advanced')}</label>
      <button className={MRT_ACTION_BTN} data-testid={'add-' + kind} title={t('tip.add')} onClick={addRow}>{t('cat.add')}</button>
    </div>
    <table className="qr-table qr-catalog"><thead><tr>
      <th style={{ width: 44 }}>{t('cat.on')}</th>
      {isMat && <th style={{ width: 110 }}>{t('cat.family')}</th>}{isMat && <th style={{ width: 80 }}>{t('cat.grade')}</th>}
      <th style={{ width: 170 }}>{t('cat.nameEn')}</th><th style={{ width: 150 }}>{t('cat.nameHe')}</th>
      <th>{t('cat.aliases')}</th><th style={{ width: 190 }}>{isMat ? t('cat.tempers') : t('cat.options')}</th>
      {advanced && <th style={{ width: 260 }}>{t('cat.pattern')}</th>}<th style={{ width: 34 }} />
    </tr></thead><tbody>
      {shown.map(([r, i]) => <tr key={r.id} data-disabled={r.enabled === false}>
        <td><input type="checkbox" checked={r.enabled !== false} onChange={(e) => upd(i, { enabled: e.target.checked })} /></td>
        {isMat && <td><input className="qr-input qr-cell" value={r.family || ''} onChange={(e) => upd(i, { family: e.target.value })} /></td>}
        {isMat && <td><input className="qr-input qr-cell" value={r.grade || ''} onChange={(e) => upd(i, { grade: e.target.value })} /></td>}
        <td><input className="qr-input qr-cell" value={r.nameEn || ''} onChange={(e) => upd(i, { nameEn: e.target.value })} /></td>
        <td><input className="qr-input qr-cell" dir="rtl" value={r.nameHe || ''} onChange={(e) => upd(i, { nameHe: e.target.value })} /></td>
        <td><AliasChips value={r.aliases || []} onChange={(v) => upd(i, { aliases: v })} /></td>
        <td><AliasChips value={(isMat ? r.tempers : r.options) || []} onChange={(v) => upd(i, isMat ? { tempers: v } : { options: v })} placeholder={isMat ? 'T6…' : t('cat.option')} /></td>
        {advanced && <td><code className="qr-pattern qr-ltr">{patterns[i] || ''}</code></td>}
        <td>{r.custom && <button className={MRT_ACTION_BTN} title={t('cat.delete')} onClick={() => onChange(rows.filter((_, j) => j !== i))}>🗑</button>}</td>
      </tr>)}
    </tbody></table>
  </div>;
}
