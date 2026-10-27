// Step 4: export the questions and the Excel; the full report opens on demand.
import React from 'react';
import { t } from '../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../ui/mrtButtons';
import { Box } from '../wizard/StepBar';

export function SummaryStep({ parts, openDialog }: any) {
  const open = (p: any) => p.problems.filter((x: any) => (x.severity === 'Blocker' || x.severity === 'Question') && x.status !== 'resolved').length;
  const nq = parts.reduce((s: number, p: any) => s + open(p), 0), np = parts.filter((p: any) => open(p) > 0).length;
  const xlsx = async () => { const r = await (window as any).qr.exportRequirements(parts); if (r && r.path) (window as any).qr.openPath(r.path); };
  return <div className="qr-summary-step" data-testid="summary-step">
    <Box title={t('wz.secQ')} testid="box-export-questions">
      <p className="qr-box-text">{t('wz.qText', { n: nq, p: np })}</p>
      <button className={MRT_BTN_PRIMARY} data-testid="btn-questions" title={t('tip.questions')} onClick={() => openDialog('questions')}>{t('wz.qBtn')}</button>
    </Box>
    <Box title={t('wz.secX')} testid="box-export-xlsx">
      <p className="qr-box-text">{t('wz.xText')}</p>
      <button className={MRT_BTN_PRIMARY} data-testid="btn-export-xlsx-all" title={t('tip.exportXlsx')} onClick={xlsx}>{t('wz.xBtn')}</button>
    </Box>
    <div className="qr-more"><button className={MRT_BTN} data-testid="btn-summary" title={t('wz.tipReport')} onClick={() => openDialog('summary')}>{t('wz.showReport')}</button></div>
  </div>;
}
