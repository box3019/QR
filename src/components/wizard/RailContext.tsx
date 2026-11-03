// Rail top: compact job table (RFQ, customer, parts, files), MRT wizard summary table look.
import React from 'react';
import { t } from '../../i18n';
import { railRows } from '../../wizard/context.mjs';
import { MrtTable, MrtHead, MrtRow } from '../../ui/MrtTable';

export function RailContext({ rfqs, parts, files }: any) {
  return <div className="qr-rail-context"><div className="qr-wsum">
    <MrtTable className="qr-wsum-table" testid="rail-context">
      <MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} />
      <tbody>{railRows({ rfqs, parts, files }).map((r) => <MrtRow key={r.key}><td>{t('ctx.' + r.key)}</td><td title={r.value}><bdi>{r.value}</bdi></td></MrtRow>)}</tbody>
    </MrtTable>
  </div></div>;
}
