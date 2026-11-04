// Rail top: compact job table (RFQ, customer, parts, files), MRT wizard summary table look.
import React from 'react';
import { t } from '../../i18n';
import { railRows } from '../../wizard/context.mjs';
import { MrtTable, MrtRow } from '../../ui/MrtTable';

export function RailContext({ rfqs, parts, files }: any) {
  return <div className="qr-rail-context mrt-wizard-rail-context"><div className="qr-wsum mrt-wizard-summary">
    <MrtTable className="qr-wsum-table mrt-wizard-summary-table" testid="rail-context">
      <tbody>{railRows({ rfqs, parts, files }).map((r) => <MrtRow key={r.key} data-rail-row={r.key}><th scope="row">{t('ctx.' + r.key)}</th><td title={r.value}><bdi>{r.value}</bdi></td></MrtRow>)}</tbody>
    </MrtTable>
  </div></div>;
}
