// All of the friend's fields of a section's rows (shown when the section is opened); flags as chips.
import React from 'react';
import { t, getLang } from '../../i18n';
import { Chip } from '../../ui/common';
import { DETAIL_ONLY, flagKeys } from '../../parts/breakdown.mjs';

export const FTONE: any = { multi: 'danger', noStd: 'danger', noCoating: 'attention', location: 'attention', assembly: 'attention' };
const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
const LTR = new Set(['stds', 'typecls', 'no', 'catno']);

export function FlagChips({ keys }: { keys: string[] }) { return <>{keys.map((k) => <Chip key={k} t={FTONE[k]} testid={'flag-' + k}>{t('bd.flag.' + k)}</Chip>)}</>; }
function Value({ f, row }: any) {
  if (f === 'flags') { const k = flagKeys(row.flags); return <span className="qr-row" data-testid="bd-flags">{k.length ? <FlagChips keys={k} /> : <bdi>{row.flags}</bdi>}</span>; }
  const v = String(L(row, f));
  return LTR.has(f) ? <span className="qr-ltr">{v}</span> : <bdi>{v}</bdi>;
}
export function Fields({ sec, rows, details }: any) {
  const fields = sec.fields.filter((f: string) => details || !DETAIL_ONLY.has(f));
  return <>{rows.map((r: any, j: number) => <dl key={j} className="qr-bd-row" data-testid={'bd-row-' + sec.key}>
    {fields.filter((f: string) => r[f] !== '' && r[f] != null && !(f === 'flagged' && !r[f])).map((f: string) => <React.Fragment key={f}><dt>{t('bd.f.' + f)}</dt><dd data-field={f}><Value f={f} row={r} /></dd></React.Fragment>)}
  </dl>)}</>;
}
