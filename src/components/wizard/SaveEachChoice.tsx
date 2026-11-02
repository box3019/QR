// Small choice before saving one PDF per part: checked, all suitable (default), or all parts.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { saveEachCounts, saveEachIndexes } from '../../parts/triage.mjs';

export function SaveEachChoice({ parts, onPick, onCancel }: any) {
  const [which, setWhich] = useState('suitable');
  const c = saveEachCounts(parts);
  const n = saveEachIndexes(parts, which).length;
  const go = () => onPick(saveEachIndexes(parts, which), c);
  return <div className="qr-modal-back" data-testid="save-each-choice" role="dialog" aria-modal="true">
    <div className="qr-modal">
      <div className="qr-panel-h">{t('tri.saveEachAsk')}</div>
      <div className="qr-save-each-opts">
        <label><input type="radio" name="save-each" data-testid="save-each-checked" checked={which === 'checked'} onChange={() => setWhich('checked')} />{t('tri.saveChecked')} ({c.checked})</label>
        <label><input type="radio" name="save-each" data-testid="save-each-suitable" checked={which === 'suitable'} onChange={() => setWhich('suitable')} />{t('tri.saveSuitable')} ({c.suitable})</label>
        <label><input type="radio" name="save-each" data-testid="save-each-all" checked={which === 'all'} onChange={() => setWhich('all')} />{t('tri.saveAll')} ({c.all})</label>
      </div>
      <div className="qr-row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button type="button" className={MRT_BTN} data-testid="save-each-cancel" onClick={onCancel}>{t('wz.cancel')}</button>
        <button type="button" className={MRT_BTN_PRIMARY} data-testid="save-each-ok" disabled={!n} onClick={go}>{t('tri.saveEach')}</button>
      </div>
    </div>
  </div>;
}
