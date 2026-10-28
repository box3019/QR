// A short notice card (never a silent failure): reason in plain words, closes by itself after a while or with the x.
import React, { useEffect } from 'react';
import { t } from '../i18n';

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => { const h = setTimeout(onClose, 12000); return () => clearTimeout(h); }, [text]);
  return <div className="qr-busy qr-notice" data-testid="notice" role="status">
    <div className="qr-busy-h"><i className="qr-dot" data-s="warn" aria-hidden="true" />{t('notice.title')}
      <button type="button" className="mrt-workspace-tab__close qr-notice-x" data-testid="notice-close" title={t('notice.close')} aria-label={t('notice.close')} onClick={onClose}>{'\u00d7'}</button></div>
    <div className="qr-busy-b"><div data-testid="notice-text">{text}</div></div></div>;
}
