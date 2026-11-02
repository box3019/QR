// Package list: Suitable / Not suitable / Material not detected. Move, include, Print and Save PDF per part; package PDF actions.
import React from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { triageLists, triageCounts, triageReason, isIncluded, moveTriage, setInclude } from '../../parts/triage.mjs';

function Row({ part, index, sel, list, onOpen, onPatch, onPrint, onSave }: any) {
  const r = triageReason(part);
  const why = [r.material || t('tri.noMat'), r.zone].filter(Boolean).join(' · ') + (r.moved ? ' · ' + t('tri.moved') : '');
  const stop = (e: any, fn: () => void) => { e.stopPropagation(); fn(); };
  return <div className="qr-tri-row" data-testid="tri-row" data-list={list} data-active={index === sel}>
    <label className="qr-tri-inc" title={t('tri.include')}><input type="checkbox" data-testid="tri-include" checked={isIncluded(part)} onChange={(e) => onPatch(index, setInclude(part, e.target.checked))} /></label>
    <button type="button" className="qr-tri-open" data-testid="tri-open" title={t('pl.open', { pn: part.partNo || '' })} onClick={() => onOpen(index)}><bdi className="qr-ltr">{part.partNo || (part.drawing && part.drawing.name) || ''}</bdi></button>
    <span className="qr-tri-why" title={why}><bdi>{why}</bdi></span>
    <span className="qr-tri-acts">
      {list !== 'suitable' && <button type="button" className={MRT_BTN} data-testid="tri-to-suit" title={t('tri.toSuit')} onClick={(e) => stop(e, () => onPatch(index, moveTriage(part, 'suitable')))}>{t('tri.toSuit')}</button>}
      {list !== 'notSuitable' && <button type="button" className={MRT_BTN} data-testid="tri-to-not" title={t('tri.toNot')} onClick={(e) => stop(e, () => onPatch(index, moveTriage(part, 'notSuitable')))}>{t('tri.toNot')}</button>}
      <button type="button" className={MRT_BTN} data-testid="tri-print" title={t('tip.printPart')} onClick={(e) => stop(e, () => onPrint(index))}>{t('top.print')}</button>
      <button type="button" className={MRT_BTN} data-testid="tri-save" title={t('tip.savePdfPart')} onClick={(e) => stop(e, () => onSave(index))}>{t('top.savePdf')}</button>
    </span>
  </div>;
}

function Sec({ k, items, ...rest }: any) {
  return <section className="qr-tri-sec" data-testid={'tri-' + k}>
    <div className="qr-panel-h"><span>{t('tri.' + k)}</span><span className="qr-muted">{items.length}</span></div>
    {items.map((x: any) => <Row key={x.part.id || x.index} {...x} list={k} {...rest} />)}
    {!items.length && <div className="qr-muted qr-tri-empty">{t('tri.empty')}</div>}
  </section>;
}

export function TriageView({ parts, sel, onOpen, onPatch, onPrint, onSave, onPrintPack, onSavePack, onSaveEach }: any) {
  const lists = triageLists(parts);
  const c = triageCounts(parts);
  return <div className="qr-triage" data-testid="triage">
    <div className="qr-tri-bar">
      <span className="qr-tri-done" data-testid="tri-processed">{t('tri.processed', { d: c.processed, n: c.total })}</span>
      <button type="button" className={MRT_BTN} data-testid="tri-print-pack" title={t('tip.printPack')} onClick={onPrintPack}>{t('tri.printPack')}</button>
      <button type="button" className={MRT_BTN} data-testid="tri-save-pack" title={t('tip.savePack')} onClick={onSavePack}>{t('tri.savePack')}</button>
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="tri-save-each" title={t('tip.saveEach')} onClick={() => onSaveEach((parts || []).map((p: any, i: number) => isIncluded(p) ? i : -1).filter((i: number) => i >= 0))}>{t('tri.saveEach')}</button>
    </div>
    <div className="qr-tri-cols">
      <Sec k="suitable" items={lists.suitable} sel={sel} onOpen={onOpen} onPatch={onPatch} onPrint={onPrint} onSave={onSave} />
      <Sec k="notSuitable" items={lists.notSuitable} sel={sel} onOpen={onOpen} onPatch={onPatch} onPrint={onPrint} onSave={onSave} />
    </div>
    <Sec k="unknown" items={lists.unknown} sel={sel} onOpen={onOpen} onPatch={onPatch} onPrint={onPrint} onSave={onSave} />
  </div>;
}
