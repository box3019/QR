// Files from another RFQ were dropped while a job is open: the user chooses; nothing is replaced without this choice.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';

export function DropChoice({ onChoose }: any) {
  return <div className="qr-modal-back" data-testid="drop-choice"><div className="qr-modal" role="dialog" aria-modal="true">
    <div className="qr-panel-h">{t('drop.askTitle')}</div>
    <div className="qr-row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
      <button className={MRT_BTN} data-testid="drop-new" title={t('tip.dropNew')} onClick={() => onChoose('new')}>{t('drop.new')}</button>
      <button className={MRT_BTN_PRIMARY} data-testid="drop-add" title={t('tip.dropAdd')} onClick={() => onChoose('append')}>{t('drop.add')}</button>
    </div></div></div>;
}
