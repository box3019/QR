// "Show table": the friend's raw NOTES / routing rows and his Excel export.
import React from 'react';
import { t } from '../../i18n';
import { Modal } from '../../ui/common';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';

export function TableDialog({ part, onClose }: any) {
  const xlsx = async () => { const all = (window as any).__qrParts || [part]; const r = await (window as any).qr.exportRequirements(all); if (r && r.path) (window as any).qr.openPath(r.path); };
  return <Modal wide title={t('bd.table')} testid="dlg-bd-table" onClose={onClose}
    footer={<><button className={MRT_BTN} data-testid="btn-export-xlsx" title={t('tip.exportXlsx')} onClick={xlsx}>{t('pp.export')}</button><button className={MRT_BTN_PRIMARY} title={t('tip.close')} onClick={onClose}>{t('bd.close')}</button></>}>
    <table className="qr-table"><thead><tr><th>{t('pp.page')}</th><th>{t('bd.t.section')}</th><th>{t('pp.no')}</th><th>{t('bd.t.text')}</th><th>{t('bd.t.cat')}</th></tr></thead>
      <tbody>{(part.requirements || []).flatMap((p: any) => p.rows.map((r: any, i: number) => <tr key={p.page + '-' + i}><td>{p.page}</td><td className="qr-ltr">{r.section}</td><td className="qr-ltr">{r.no}</td><td><bdi style={{ whiteSpace: 'pre-wrap' }}>{r.text}</bdi></td><td>{r.cat}</td></tr>))}</tbody></table>
  </Modal>;
}
