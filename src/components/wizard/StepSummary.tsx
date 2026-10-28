// Step 4: stat tiles across the top, then a 2-column card grid (questions / Excel / report on screen / PDF) in a centred container.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { exportReport } from '../../wizard/report';
import { Box } from './Box';
import { RouteCardSummary } from '../partcard/RouteCardSection';
import { ChecklistSummary } from '../../checklist/ChecklistSummary';
import { tileCounts, GROUP_ORDER, DOT } from '../../parts/groups.mjs';
import { summaryCounts } from '../../wizard/summary.mjs';

function Stat({ k, n, label, dot, testid }: any) {
  return <div className="qr-stat" data-k={k} data-zero={n === 0} data-testid={testid}>
    <span className="qr-stat-n">{n}</span>
    <span className="qr-stat-l"><i className="qr-dot" data-s={dot} aria-hidden="true" />{label}</span>
  </div>;
}

export function StepSummary({ parts, openDialog, goPart, lang, meta }: any) {
  const { nq, np, flagged } = summaryCounts(parts);
  const xlsx = async () => { const r = await (window as any).qr.exportRequirements(parts); if (r && r.path) (window as any).qr.openPath(r.path); };
  const counts = tileCounts(parts);
  return <div className="qr-summary-step" data-testid="summary-step"><div className="qr-sum-wrap">
    {flagged.length > 0 && <div className="qr-warnbar" data-testid="sum-flagged"><span>{t('wz.flagged', { n: flagged.length })}</span><button className={MRT_BTN} title={t('tip.goFlagged')} onClick={() => goPart(flagged[0])}>{t('wz.goFlagged')}</button></div>}
    <div className="qr-stats" data-testid="sum-totals">
      <Stat k="parts" n={parts.length} label={t('wz.parts')} dot="none" />
      {GROUP_ORDER.map((k: string) => <Stat key={k} k={k} n={counts[k]} label={t('tile.' + k)} dot={(DOT as any)[k]} />)}
      <Stat k="questions" n={nq} label={t('wz.questions')} dot={nq ? 'warn' : 'ok'} />
    </div>
    <ChecklistSummary parts={parts} goPart={goPart} />
    <RouteCardSummary parts={parts} />
    <div className="qr-sum-grid">
      <Box title={t('wz.secQ')} testid="box-export-questions">
        <p className="qr-box-text">{t(nq === 1 && np === 1 ? 'wz.qText1' : 'wz.qText', { n: nq, p: np })}</p>
        <button className={nq > 0 ? MRT_BTN_PRIMARY : MRT_BTN} data-testid="btn-questions" title={t('tip.questions')} onClick={() => openDialog('questions')}>{t('wz.qBtn')}</button>
      </Box>
      <Box title={t('wz.secX')} testid="box-export-xlsx">
        <p className="qr-box-text">{t('wz.xDesc')}</p>
        <button className={nq > 0 ? MRT_BTN : MRT_BTN_PRIMARY} data-testid="btn-export-xlsx-all" title={t('tip.exportXlsx')} onClick={xlsx}>{t('wz.xBtn')}</button>
      </Box>
      <Box title={t('wz.secShow')} testid="box-show-report">
        <p className="qr-box-text">{t('wz.showText')}</p>
        <button className={MRT_BTN} data-testid="btn-summary" title={t('wz.tipReport')} onClick={() => openDialog('summary')}>{t('wz.showReport')}</button>
      </Box>
      <Box title={t('wz.secPdf')} testid="box-export-pdf">
        <p className="qr-box-text">{t('wz.pdfText')}</p>
        <button className={MRT_BTN} data-testid="btn-export-pdf" title={t('tip.exportPdf')} onClick={() => exportReport(parts, lang, meta)}>{t('wz.pdfBtn')}</button>
      </Box>
    </div>
  </div></div>;
}
