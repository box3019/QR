// One card line: LABEL value [standard] flags + its single action; grey "not on drawing" when empty; opens to all fields.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN } from '../../ui/mrtButtons';
import { sectionRows, sectionLine, sectionStds, sectionFlags, sectionAction } from '../../parts/breakdown.mjs';
import { Fields, FlagChips } from './Fields';

export function CardSection({ sec, pg, part, card, details, goStep }: any) {
  const rows = sectionRows(sec, pg); const empty = !rows.length; const k = pg.page + sec.key;
  const fl = sectionFlags(sec, pg); const act = sectionAction(fl, empty && sec.key === 'material'); const stds = sectionStds(sec, pg);
  const showAct = !empty || sec.key === 'material';
  return <section className="qr-bsec" data-testid={'bd-' + sec.key} data-empty={empty} data-open={card.open === k}>
    <div className="qr-sec-line">
      <button type="button" className="qr-sec-main" title={t('tip.bdSection')} data-testid={'bd-open-' + sec.key} onClick={() => !empty && card.toggle(sec, pg)}>
        <span className="qr-lbl">{t('bd.s.' + sec.key)}</span>
        <span className="qr-sec-val">{empty ? t('bd.notOn') : <bdi>{sectionLine(sec.key, pg, part)}</bdi>}</span>
        {stds.length > 0 && <span className="qr-ltr qr-muted qr-sec-std">[{stds.slice(0, 2).join('; ')}]</span>}
        <FlagChips keys={fl} />
      </button>
      {showAct && (act === 'confirm'
        ? <button type="button" className={MRT_BTN} data-active={!!card.ok[k]} data-testid={'bd-act-' + sec.key} title={t('tip.bd.confirm')} onClick={() => card.confirm(k)}>{card.ok[k] ? '✓ ' : ''}{t('bd.a.confirm')}</button>
        : <button type="button" className={MRT_BTN} data-testid={'bd-act-' + sec.key} title={t('tip.bd.' + act)} onClick={() => goStep(3)}>{t('bd.a.' + act)}</button>)}
    </div>
    {card.open === k && <div className="qr-sec-body"><Fields sec={sec} rows={rows} details={details} /></div>}
  </section>;
}
