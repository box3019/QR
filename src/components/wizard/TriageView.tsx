// Package list: Suitable / Not suitable / Material not detected. Move, include, Print and Save PDF per part; package PDF actions.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { MrtTable, MrtHead, MrtGroup, MrtRow, OverflowLine } from '../../ui/MrtTable';
import { triageLists, triageCounts, triageReason, isIncluded, moveTriage, setInclude } from '../../parts/triage.mjs';
import { SaveEachChoice } from './SaveEachChoice';

function Row({ part, index, sel, list, onOpen, onPatch, onPrint, onSave }: any) {
  const r = triageReason(part);
  const why = [r.material || t('tri.noMat'), r.zone].filter(Boolean).join(' · ');
  const stop = (e: any, fn: () => void) => { e.stopPropagation(); fn(); };
  return <MrtRow className="qr-tri-row" data-testid="tri-row" data-list={list} active={index === sel}>
    <td className="qr-tri-inc"><label title={t('tri.include')}><input type="checkbox" data-testid="tri-include" checked={isIncluded(part)} onChange={(e) => onPatch(index, setInclude(part, e.target.checked))} /></label></td>
    <td><button type="button" className="qr-tri-open" data-testid="tri-open" title={t('pl.open', { pn: part.partNo || '' })} onClick={() => onOpen(index)}><bdi className="qr-ltr">{part.partNo || (part.drawing && part.drawing.name) || ''}</bdi></button></td>
    <td><OverflowLine className="qr-tri-why" testid="tri-why" text={why}><bdi>{why}</bdi></OverflowLine></td>
    <td>{r.moved ? <span className="qr-tri-moved" data-testid="tri-moved">{t('tri.moved')}</span> : <span className="qr-muted">{'\u2013'}</span>}</td>
    <td className="qr-tri-acts">
      {list !== 'suitable' && <button type="button" className={MRT_BTN} data-testid="tri-to-suit" title={t('tri.toSuit')} onClick={(e) => stop(e, () => onPatch(index, moveTriage(part, 'suitable')))}>{t('tri.toSuit')}</button>}
      {list !== 'notSuitable' && <button type="button" className={MRT_BTN} data-testid="tri-to-not" title={t('tri.toNot')} onClick={(e) => stop(e, () => onPatch(index, moveTriage(part, 'notSuitable')))}>{t('tri.toNot')}</button>}
      <button type="button" className={MRT_BTN} data-testid="tri-print" title={t('tip.printPart')} onClick={(e) => stop(e, () => onPrint(index))}>{t('top.print')}</button>
      <button type="button" className={MRT_BTN} data-testid="tri-save" title={t('tip.savePdfPart')} onClick={(e) => stop(e, () => onSave(index))}>{t('top.savePdf')}</button>
    </td>
  </MrtRow>;
}

export function TriageView({ parts, sel, onOpen, onPatch, onPrint, onSave, onPrintPack, onSavePack, onSaveEach }: any) {
  const lists = triageLists(parts);
  const c = triageCounts(parts);
  const [ask, setAsk] = useState(false);
  const COLS = 5;
  return <div className="qr-triage" data-testid="triage">
    <div className="qr-tri-bar">
      <span className="qr-tri-done" data-testid="tri-processed">{t('tri.processed', { d: c.processed, n: c.total })}</span>
      <button type="button" className={MRT_BTN} data-testid="tri-print-pack" title={t('tip.printPack')} onClick={onPrintPack}>{t('tri.printPack')}</button>
      <button type="button" className={MRT_BTN} data-testid="tri-save-pack" title={t('tip.savePack')} onClick={onSavePack}>{t('tri.savePack')}</button>
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="tri-save-each" title={t('tip.saveEach')} onClick={() => setAsk(true)}>{t('tri.saveEach')}</button>
    </div>
    <MrtTable className="qr-tri-tab" cols={<colgroup><col style={{ width: '5.2rem' }} /><col style={{ width: '22%' }} /><col /><col style={{ width: '7rem' }} /><col style={{ width: '28%' }} /></colgroup>}>
      <MrtHead cells={[t('tri.includeCol'), t('ck.col.item'), t('ck.col.value'), t('ck.col.status'), '']} />
      <tbody>
        {(['suitable', 'notSuitable', 'unknown'] as const).map((k) => <React.Fragment key={k}>
          <MrtGroup colSpan={COLS} testid={'tri-' + k}>{t('tri.' + k)} · {lists[k].length}</MrtGroup>
          {lists[k].map((x: any) => <Row key={x.part.id || x.index} {...x} list={k} sel={sel} onOpen={onOpen} onPatch={onPatch} onPrint={onPrint} onSave={onSave} />)}
          {!lists[k].length && <MrtRow className="qr-tri-empty"><td colSpan={COLS} className="qr-muted">{t('tri.empty')}</td></MrtRow>}
        </React.Fragment>)}
      </tbody>
    </MrtTable>
    {ask && <SaveEachChoice parts={parts} onCancel={() => setAsk(false)} onPick={(indexes: number[], counts: any) => { setAsk(false); onSaveEach(indexes, counts); }} />}
  </div>;
}
