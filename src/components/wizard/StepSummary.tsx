// Step 4: one primary export, missing documents and questions, Print / Save PDF in the top bar. Full checklist and route card stay collapsed.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { Box } from './Box';
import { RouteCardSummary } from '../partcard/RouteCardSection';
import { ChecklistSummary } from '../../checklist/ChecklistSummary';
import { tileCounts, GROUP_ORDER, DOT } from '../../parts/groups.mjs';
import { summaryCounts } from '../../wizard/summary.mjs';
import { MoreMenu } from '../MoreMenu';

function Stat({ k, n, label, dot, testid }: any) {
  return <div className="qr-stat" data-k={k} data-zero={n === 0} data-testid={testid}>
    <span className="qr-stat-n">{n}</span>
    <span className="qr-stat-l"><i className="qr-dot" data-s={dot} aria-hidden="true" />{label}</span>
  </div>;
}

export function StepSummary({ parts, openDialog, goPart }: any) {
  const { nq, np, flagged } = summaryCounts(parts);
  const xlsx = async () => { const r = await (window as any).qr.exportRequirements(parts); if (r && r.path) (window as any).qr.openPath(r.path); };
  const counts = tileCounts(parts);
  const docs = parts.reduce((n: number, p: any) => n + ((p.tasks || []).filter((x: any) => x.type === 'uploadDocument' && x.stage !== 'routecard' && x.status !== 'done').length), 0);
  return <div className="qr-summary-step" data-testid="summary-step"><div className="qr-sum-wrap">
    {flagged.length > 0 && <div className="qr-warnbar" data-testid="sum-flagged"><span>{t('wz.flagged', { n: flagged.length })}</span><button className={MRT_BTN} title={t('tip.goFlagged')} onClick={() => goPart(flagged[0])}>{t('wz.goFlagged')}</button></div>}
    <div className="qr-stats" data-testid="sum-totals">
      <Stat k="parts" n={parts.length} label={t('wz.parts')} dot="none" />
      {GROUP_ORDER.map((k: string) => <Stat key={k} k={k} n={counts[k]} label={t('tile.' + k)} dot={(DOT as any)[k]} />)}
      <Stat k="docs" n={docs} label={t('gd.docs')} dot={docs ? 'warn' : 'ok'} />
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
    </div>
    <div className="qr-sum-more"><MoreMenu testid="sum-more" items={[{ testid: 'btn-summary', label: t('wz.showReport'), tip: t('wz.tipReport'), onClick: () => openDialog('summary') }]} /></div>
  </div></div>;
}
