// Step 1 while and after importing: e-mail subject and sender, every file with a plain status, one overall progress bar.
import React from 'react';
import { t } from '../../i18n';
import { importProgress } from '../../wizard/importView.mjs';

export function ImportView({ view }: any) {
  const pr = importProgress(view);
  return <div className="qr-import" data-testid="import-view" data-active={view.active}>
    {view.mails.map((m: any, i: number) => <div key={i} className="qr-wsum" data-testid="import-mail"><table className="qr-wsum-table"><tbody>
      <tr><th>{t('imp.subject')}</th><td><bdi>{m.subject || '\u2014'}</bdi></td></tr>
      <tr><th>{t('imp.from')}</th><td><bdi>{m.from || '\u2014'}</bdi></td></tr>
    </tbody></table></div>)}
    <div className="qr-import-prog" data-testid="import-progress"><span>{t('imp.progress', { d: pr.d, n: pr.n })}</span>
      <div className="qr-bar" data-testid="import-bar"><div style={{ width: Math.round(pr.frac * 100) + '%' }} /></div></div>
    <div className="qr-panel-h">{t('imp.files', { n: view.files.length })}</div>
    <ul className="qr-import-files" data-testid="import-files">{view.files.map((f: any) => <li key={f.name} data-status={f.status}>
      <bdi className="qr-ltr">{f.name}</bdi><span className="qr-import-st" data-status={f.status}>{t('imp.st.' + f.status)}</span></li>)}</ul>
  </div>;
}
