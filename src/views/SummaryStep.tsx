// Step 4: export the questions and the Excel; the full report opens on demand.
import React from 'react';
import { t } from '../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../ui/mrtButtons';
import { Box } from '../wizard/StepBar';
import { groupParts } from '../parts/groups.mjs';

export function SummaryStep({ parts, openDialog, goPart }: any) {
  const open = (p: any) => p.problems.filter((x: any) => (x.severity === 'Blocker' || x.severity === 'Question') && x.status !== 'resolved').length;
  const nq = parts.reduce((s: number, p: any) => s + open(p), 0), np = parts.filter((p: any) => open(p) > 0).length;
  const xlsx = async () => { const r = await (window as any).qr.exportRequirements(parts); if (r && r.path) (window as any).qr.openPath(r.path); };
  const flagged = parts.map((p: any, i: number) => ({ p, i })).filter(({ p }: any) => p.problems.some((x: any) => (x.severity === 'Blocker' || x.severity === 'Warning') && x.status !== 'resolved'));
  const groups = groupParts(parts);
  return <div className="qr-summary-step" data-testid="summary-step">
    {flagged.length > 0 && <div className="qr-warnbar" data-testid="sum-flagged"><span>{t('wz.flagged', { n: flagged.length })}</span><button className={MRT_BTN} title={t('tip.goFlagged')} onClick={() => goPart(flagged[0].i)}>{t('wz.goFlagged')}</button></div>}
    <div className="qr-sum-line" data-testid="sum-totals"><span className="qr-lbl">{t('wz.parts')}</span> <b>{parts.length}</b>{groups.map((g: any) => <span key={g.key} className="qr-sum-g" data-g={g.key}>{t('pg.' + g.key)} {g.items.length}</span>)}<span className="qr-lbl">{t('wz.questions')}</span> <b>{nq}</b></div>
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
