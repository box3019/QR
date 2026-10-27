// Plain localized progress ("Reading drawing 2 of 7…") with a bar; the technical line only with Details.
import React from 'react';
import { t } from '../../i18n';
import { progressView } from '../../wizard/progress.mjs';

export function ProgressToast({ busy, details }: any) {
  const v = progressView(busy);
  return <div className="qr-busy" data-testid="busy" role="status"><div data-testid="busy-text">{t(v.key, v.vars)}</div>
    {v.frac != null && <div className="qr-bar"><div style={{ width: Math.round(v.frac * 100) + '%' }} /></div>}
    {details && v.tech && <div className="qr-busy-tech" data-testid="busy-tech">{v.tech}</div>}</div>;
}
