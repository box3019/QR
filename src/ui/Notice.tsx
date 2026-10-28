// A short notice card (never a silent failure): reason in plain words, closes by itself after a while or with the x.
import React, { useEffect } from 'react';
import { t } from '../i18n';

export function Notice({ text, onClose, action }: { text: string; onClose: () => void; action?: { label: string; run: () => void } | null }) {
  useEffect(() => { const h = setTimeout(onClose, action ? 30000 : 12000); return () => clearTimeout(h); }, [text]);
  return <div className="qr-busy qr-notice" data-testid="notice" role="status">
    <div className="qr-busy-h"><i className="qr-dot" data-s="warn" aria-hidden="true" />{t('notice.title')}
      <button type="button" className="mrt-workspace-tab__close qr-notice-x" data-testid="notice-close" title={t('notice.close')} aria-label={t('notice.close')} onClick={onClose}>{'\u00d7'}</button></div>
    <div className="qr-busy-b"><div data-testid="notice-text">{text}</div>{action && <button type="button" className="mrt-action-btn qr-notice-undo" data-testid="notice-action" title={action.label} onClick={action.run}>{action.label}</button>}</div></div>;
}
