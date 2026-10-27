import React, { useState } from 'react';
import { t } from '../i18n';
import { DOT } from './groups.mjs';

/** Collapsible header + body for one status group in the Parts list. Every group header looks the same: name, count, small status dot. */
export function PartGroup({ k, n, children }: { k: string; n: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <section className="qr-pgroup" data-status={k} data-testid={'pgroup-' + k} data-open={open}>
    <button type="button" className="qr-pgroup-h" data-testid={'pgroup-h-' + k} aria-expanded={open} title={t(open ? 'pg.collapse' : 'pg.expand')} onClick={() => setOpen(!open)}>
      <span className="qr-pgroup-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      <i className="qr-dot" data-s={DOT[k]} aria-hidden="true" />
      <span className="qr-pgroup-name">{t('pg.' + k)}</span>
      <span className="qr-pgroup-n">{n}</span>
    </button>
    {open && <div className="qr-pgroup-body">{children}</div>}
  </section>;
}
