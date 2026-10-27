// Rail top: compact job table (RFQ, customer, parts, files), MRT wizard summary table look.
import React from 'react';
import { t } from '../../i18n';
import { railRows } from '../../wizard/context.mjs';

export function RailContext({ rfqs, parts, files }: any) {
  return <div className="qr-rail-context"><div className="qr-wsum">
    <table className="qr-wsum-table" data-testid="rail-context"><tbody>
      {railRows({ rfqs, parts, files }).map((r) => <tr key={r.key}><th scope="row">{t('ctx.' + r.key)}</th><td title={r.value}><bdi>{r.value}</bdi></td></tr>)}
    </tbody></table>
  </div></div>;
}
