import React from 'react';
import { MRT_ACTION_BTN } from '../ui/mrtButtons';
import { t } from '../i18n';

export function UpdateProgress({ version, notes, frac, phase, onCancel }: { version: string; notes?: string[]; frac?: number | null; phase?: string; onCancel: () => void }) {
  const pct = frac == null ? null : Math.max(0, Math.min(100, Math.round(frac * 100)));
  const text = phase === 'verify' ? t('upd.verify') : phase === 'start' ? t('upd.start') : t('upd.copy');
  return <div className="qr-busy qr-upd-progress" data-testid="upd-progress" role="status">
    <div className="qr-busy-h">{t('upd.progressTitle', { version })}{pct != null && <span className="qr-busy-pct">{pct}%</span>}</div>
    <div className="qr-busy-b">
      <div data-testid="upd-progress-text">{text}</div>
      {pct != null && <div className="qr-bar"><div style={{ width: pct + '%' }} /></div>}
      {!!(notes && notes.length) && <ul className="qr-upd-notes" data-testid="upd-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
      <button type="button" className={MRT_ACTION_BTN} data-testid="upd-cancel" title={t('upd.cancel')} onClick={onCancel}>{t('upd.cancel')}</button>
    </div>
  </div>;
}
