import React from 'react';
import { MRT_ACTION_BTN, MRT_ACTION_BTN_PRIMARY } from '../ui/mrtButtons';
import { t } from '../i18n';

export function UpdateBanner({ version, mandatory, onNow, onLater }: { version: string; mandatory?: boolean; onNow: () => void; onLater: () => void }) {
  return <div className="qr-upd-banner" data-testid="upd-banner" role="status">
    <span className="qr-upd-banner-text">{t('upd.available', { version })}</span>
    <button type="button" className={MRT_ACTION_BTN_PRIMARY} data-testid="upd-now" title={t('upd.now')} onClick={onNow}>{t('upd.now')}</button>
    {!mandatory && <button type="button" className={MRT_ACTION_BTN} data-testid="upd-later" title={t('upd.later')} onClick={onLater}>{t('upd.later')}</button>}
  </div>;
}
