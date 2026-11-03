// Step 1 once parts are loaded: stat tiles (parts, files, drawings, models), the files grouped by part in a compact list, Next, and Add files / Add folder.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { loadedSummary } from '../../wizard/loaded.mjs';
import { RfqBar } from './RfqBar';
import { MrtTable, MrtHead, MrtRow, OverflowLine } from '../../ui/MrtTable';

function Stat({ k, n, label }: any) {
  return <div className="qr-stat" data-k={k} data-zero={n === 0} data-testid={'ld-' + k}>
    <span className="qr-stat-n">{n}</span><span className="qr-stat-l">{label}</span></div>;
}
export function LoadedSummary({ rfqs, parts, files, unknown, details, onNext, onPart, onFiles, onFolder }: any) {
  const s = loadedSummary(parts, files, unknown);
  return <div className="qr-step-intake qr-loaded" data-testid="loaded-summary">
    {(rfqs || []).map((r: any, i: number) => <RfqBar key={i} rfq={r} />)}
    <div className="qr-stats" data-testid="ld-tiles">
      <Stat k="parts" n={s.tiles.parts} label={t('ld.parts')} /><Stat k="files" n={s.tiles.files} label={t('ld.files')} />
      <Stat k="drawings" n={s.tiles.drawings} label={t('ld.drawings')} /><Stat k="models" n={s.tiles.models} label={t('ld.models')} />
    </div>
    <div className="qr-panel qr-loaded-box">
      <div className="qr-panel-h">{t('ld.list')}</div>
      <MrtTable className="qr-loaded-list" testid="ld-list">
        <MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} />
        <tbody>
          {s.groups.map((g: any) => <MrtRow key={g.index} data-testid="ld-part">
            <td><button type="button" className="qr-loaded-part" title={t('ld.tipPart')} data-testid="ld-part-btn" onClick={() => onPart(g.index)}><bdi className="qr-ltr">{g.partNo}</bdi>{g.rev && <span className="qr-muted"> <bdi className="qr-ltr">{g.rev}</bdi></span>}</button></td>
            <td><OverflowLine className="qr-ck-body" text={g.files.join(' · ')}><span className="qr-loaded-files">{g.files.map((f: string) => <bdi key={f} className="qr-ltr">{f}</bdi>)}</span></OverflowLine></td>
          </MrtRow>)}
          {s.other.length > 0 && <MrtRow data-testid="ld-other">
            <td className="qr-muted">{t('ld.other', { n: s.other.length })}</td>
            <td><OverflowLine className="qr-ck-body" text={s.other.join(' · ')}><span className="qr-loaded-files">{s.other.map((f: string) => <bdi key={f} className="qr-ltr">{f}</bdi>)}</span></OverflowLine></td>
          </MrtRow>}
        </tbody>
      </MrtTable>
    </div>
    {details && s.unknown.length > 0 && <div className="qr-muted">{t('drop.notDrawings', { list: s.unknown.join(', ') })}</div>}
    <div className="qr-loaded-btns">
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="btn-loaded-next" title={t('wz.tipNext')} onClick={onNext}>{t('wz.next')} <span aria-hidden className="qr-chev">{'\u203a'}</span></button>
      <button type="button" className={MRT_BTN} data-testid="btn-loaded-files" title={t('tip.addFiles')} onClick={onFiles}>{t('top.addFiles')}</button>
      <button type="button" className={MRT_BTN} data-testid="btn-loaded-folder" title={t('tip.addFolder')} onClick={onFolder}>{t('top.addFolder')}</button>
    </div>
  </div>;
}
