// All of the friend's fields of a section's rows (shown when the section is opened); flags as chips.
import React from 'react';
import { t, getLang } from '../../i18n';
import { Chip } from '../../ui/common';
import { OverflowLine, MrtTable, MrtHead, MrtRow } from '../../ui/MrtTable';
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
  const cells = rows.flatMap((r: any, j: number) => fields.filter((f: string) => r[f] !== '' && r[f] != null && !(f === 'flagged' && !r[f])).map((f: string) => ({ r, j, f })));
  if (!cells.length) return null;
  return <MrtTable className="qr-bd-tab" testid={'bd-row-' + sec.key}>
    <MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} />
    <tbody>{cells.map(({ r, j, f }: any) => {
      const item = t('bd.f.' + f);
      const plain = f === 'flags' ? flagKeys(r.flags).map((k: string) => t('bd.flag.' + k)).join(' · ') : String(L(r, f));
      return <MrtRow key={j + '-' + f} className="qr-bd-item">
        <td className="qr-bd-k"><OverflowLine className="qr-bd-lab" text={item}>{item}</OverflowLine></td>
        <td className="qr-bd-v" data-field={f}><OverflowLine className="qr-bd-body" text={plain}><Value f={f} row={r} /></OverflowLine></td>
      </MrtRow>;
    })}</tbody>
  </MrtTable>;
}
