// Step 1: drop zone (title only, explanation in the assistant) with Choose files (primary) and Choose folder; RFQ lines; unread files only with Details.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { RfqBar } from './RfqBar';

export function StepIntake({ rfqs, over, details, unknown, onFiles, onFolder }: any) {
  return <div className="qr-step-intake">
    {rfqs.map((r: any, i: number) => <RfqBar key={i} rfq={r} />)}
    <div className="qr-drop" data-over={over} data-testid="dropzone">
      <div>
        <h1>{t('drop.title')}</h1>
        <div className="qr-drop-btns">
          <button className={MRT_BTN_PRIMARY + ' qr-big qr-blue'} data-testid="btn-choose-files" title={t('tip.addFiles')} onClick={onFiles}>{t('drop.choose')}</button>
          <button className={MRT_BTN} data-testid="btn-choose-folder" title={t('tip.addFolder')} onClick={onFolder}>{t('drop.chooseFolder')}</button>
        </div>
        {details && unknown.length > 0 && <div className="qr-muted" style={{ marginTop: 12 }}>{t('drop.notDrawings', { list: unknown.join(', ') })}</div>}
      </div>
    </div>
  </div>;
}
