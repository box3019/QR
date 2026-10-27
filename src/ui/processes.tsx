// Processes panel: friend's extraction (core/requirements) — heat treat, coatings in order, paint, masking, material.
import React from 'react';
import { t, getLang } from '../i18n';
import { MRT_BTN } from './mrtButtons';

const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');

export function ProcessesPanel({ part }: any) {
  const req = (part.requirements || []).filter((p: any) => p.rows && p.rows.length);
  const exportXlsx = async () => { const all = (window as any).__qrParts || [part]; const r = await (window as any).qr.exportRequirements(all); if (r && r.path) (window as any).qr.openPath(r.path); };
  return <div className="qr-processes" data-testid="processes-panel" style={{ padding: '0.8rem' }}>
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <h3 style={{ margin: 0 }}>{t('pp.title')}</h3>
      <button className={MRT_BTN} data-testid="btn-export-xlsx" title={t('tip.exportXlsx')} onClick={exportXlsx}>{t('pp.export')}</button>
    </div>
    {!req.length && <div className="qr-muted">{t('pp.none')}</div>}
    {req.map((p: any, i: number) => <div key={i} style={{ marginTop: '0.6rem' }}>
      {req.length > 1 && <div className="qr-muted">{t('pp.page')} {p.page}</div>}
      <div className="qr-kv">
        <div>{t('pp.material')}</div><div><bdi>{p.material ? [L(p.material, 'family'), p.material.alloy, p.material.temper, p.material.form].filter(Boolean).join(' ') : '—'}</bdi>{p.material && p.material.stds ? <div className="qr-muted qr-ltr">{p.material.stds}</div> : null}</div>
        <div>{t('pp.heat')}</div><div><bdi>{L(p.summary, 'heatTreat') || '—'}</bdi></div>
        <div>{t('pp.coatings')}</div><div><bdi>{L(p.summary, 'coatings') || '—'}</bdi></div>
        <div>{t('pp.paint')}</div><div><bdi>{L(p.summary, 'paint') || '—'}</bdi></div>
        <div>{t('pp.masking')}</div><div><bdi>{L(p.summary, 'masking') || '—'}</bdi></div>
        <div>{t('pp.flow')}</div><div><bdi>{L(p.summary, 'flow') || '—'}</bdi></div>
      </div>
      {p.procs.length > 0 && <table className="qr-table" style={{ marginTop: '0.5rem' }}>
        <thead><tr><th>{t('pp.no')}</th><th>{t('pp.process')}</th><th>{t('pp.specs')}</th><th>{t('pp.details')}</th></tr></thead>
        <tbody>{p.procs.map((q: any, j: number) => <tr key={j}><td>{q.no}</td><td><bdi>{L(q, 'subtype')}</bdi>{q.layer ? <span className="qr-muted"> ({q.layer})</span> : null}</td>
          <td className="qr-ltr">{[q.stds, q.typecls].filter(Boolean).join(' · ')}</td><td className="qr-ltr">{[q.thick, q.color, q.coats, q.hard, q.temp, q.case].filter(Boolean).join(' · ')}</td></tr>)}</tbody>
      </table>}
    </div>)}
  </div>;
}
