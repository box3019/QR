import React, { useState } from 'react';
import { t } from '../i18n';

/** Collapsible header + body for one status group in the Parts list. */
export function PartGroup({ k, n, children }: { k: string; n: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <section className="qr-pgroup" data-status={k} data-testid={'pgroup-' + k} data-open={open}>
    <button type="button" className="qr-pgroup-h" data-testid={'pgroup-h-' + k} aria-expanded={open} title={t(open ? 'pg.collapse' : 'pg.expand')} onClick={() => setOpen(!open)}>
      <span className="qr-pgroup-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      <span className="qr-pgroup-name">{t('pg.' + k)}</span>
      <span className="qr-pgroup-n">{n}</span>
    </button>
    {open && <div className="qr-pgroup-body">{children}</div>}
  </section>;
}
