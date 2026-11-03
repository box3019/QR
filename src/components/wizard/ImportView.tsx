// Step 1 while and after importing: e-mail subject and sender, every file with a plain status, one overall progress bar.
import React from 'react';
import { t } from '../../i18n';
import { importProgress } from '../../wizard/importView.mjs';
import { MrtTable, MrtHead, MrtRow, OverflowLine } from '../../ui/MrtTable';

export function ImportView({ view }: any) {
  const pr = importProgress(view);
  return <div className="qr-import" data-testid="import-view" data-active={view.active}>
    {view.mails.map((m: any, i: number) => <div key={i} className="qr-wsum" data-testid="import-mail"><MrtTable className="qr-wsum-table">
      <MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} />
      <tbody>
        <MrtRow><td>{t('imp.subject')}</td><td><bdi>{m.subject || '\u2014'}</bdi></td></MrtRow>
        <MrtRow><td>{t('imp.from')}</td><td><bdi>{m.from || '\u2014'}</bdi></td></MrtRow>
      </tbody>
    </MrtTable></div>)}
    <div className="qr-import-prog" data-testid="import-progress" data-done={pr.kind === 'parts' && pr.n > 0 && pr.d >= pr.n}><span className={pr.kind === 'parts' && pr.n > 0 && pr.d >= pr.n ? 'qr-import-done' : undefined}>{t(pr.kind === 'parts' ? 'imp.analysed' : 'imp.progress', { d: pr.d, n: pr.n })}</span>
      <div className="qr-bar" data-testid="import-bar"><div style={{ width: Math.round(pr.frac * 100) + '%' }} /></div></div>
    <div className="qr-panel-h">{t('imp.files', { n: view.files.length })}</div>
    <MrtTable className="qr-import-files" testid="import-files">
      <MrtHead cells={[t('ck.col.item'), t('ck.col.status')]} />
      <tbody>{view.files.map((f: any) => {
        const st = f.status === 'attached' ? t('imp.st.attached', { pn: f.partNo || '' }) : t('imp.st.' + f.status);
        return <MrtRow key={f.path || f.name} data-status={f.status} title={f.title || f.name}>
          <td><OverflowLine className="qr-ck-body" text={f.name}><bdi className="qr-ltr">{f.name}</bdi></OverflowLine></td>
          <td><span className="qr-import-st" data-status={f.status}>{st}</span></td>
        </MrtRow>;
      })}</tbody>
    </MrtTable>
  </div>;
}
