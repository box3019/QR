// Package list: Suitable / Not suitable / Material not detected. Move, include, Print and Save PDF per part; package PDF actions.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { MrtTable, MrtHead, MrtGroup, MrtEmpty, MrtRow, OverflowLine } from '../../ui/MrtTable';
import { triageLists, triageCounts, triageReason, isIncluded, moveTriage, setInclude } from '../../parts/triage.mjs';
import { SaveEachChoice } from './SaveEachChoice';
import { MoreMenu } from '../MoreMenu';

function Row({ part, index, sel, list, onOpen, onPatch, onPrint, onSave }: any) {
  const r = triageReason(part);
  const why = [r.material || t('tri.noMat'), r.zone].filter(Boolean).join(' · ');
  return <MrtRow className="qr-tri-row" data-testid="tri-row" data-list={list} active={index === sel}>
    <td className="qr-tri-inc"><label title={t('tri.include')}><input type="checkbox" data-testid="tri-include" checked={isIncluded(part)} onChange={(e) => onPatch(index, setInclude(part, e.target.checked))} /></label></td>
    <td><button type="button" className="qr-tri-open" data-testid="tri-open" title={t('pl.open', { pn: part.partNo || '' })} onClick={() => onOpen(index)}><bdi className="qr-ltr">{part.partNo || (part.drawing && part.drawing.name) || ''}</bdi></button></td>
    <td><OverflowLine className="qr-tri-why" testid="tri-why" text={why}><bdi>{why}</bdi></OverflowLine></td>
    <td>{r.moved ? <span className="qr-tri-moved" data-testid="tri-moved">{t('tri.moved')}</span> : <span className="qr-muted">{'\u2013'}</span>}</td>
    <td className="qr-tri-acts">
      <MoreMenu row testid={'tri-more-' + index} items={[
        list !== 'suitable' && { testid: 'tri-to-suit', label: t('tri.toSuit'), onClick: () => onPatch(index, moveTriage(part, 'suitable')) },
        list !== 'notSuitable' && { testid: 'tri-to-not', label: t('tri.toNot'), onClick: () => onPatch(index, moveTriage(part, 'notSuitable')) },
        { testid: 'tri-print', label: t('top.print'), tip: t('tip.printPart'), onClick: () => onPrint(index) },
        { testid: 'tri-save', label: t('top.savePdf'), tip: t('tip.savePdfPart'), onClick: () => onSave(index) },
      ]} />
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
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="tri-save-each" title={t('tip.saveEach')} onClick={() => setAsk(true)}>{t('tri.saveEach')}</button>
      <MoreMenu testid="tri-pack-more" items={[
        { testid: 'tri-print-pack', label: t('tri.printPack'), tip: t('tip.printPack'), onClick: onPrintPack },
        { testid: 'tri-save-pack', label: t('tri.savePack'), tip: t('tip.savePack'), onClick: onSavePack },
      ]} />
    </div>
    <MrtTable shell fit="content" className="qr-tri-tab" cols={<colgroup><col className="qr-mrt-c-check" /><col className="qr-mrt-c-id" /><col className="qr-mrt-c-text" /><col className="qr-mrt-c-status" /><col className="qr-mrt-c-menu" /></colgroup>}>
      <MrtHead cells={[t('tri.includeCol'), t('ck.col.item'), t('ck.col.value'), t('ck.col.status'), '']} />
      <tbody>
        {(['suitable', 'notSuitable', 'unknown'] as const).map((k) => <React.Fragment key={k}>
          <MrtGroup colSpan={COLS} testid={'tri-' + k}>{t('tri.' + k)} · {lists[k].length}</MrtGroup>
          {lists[k].map((x: any) => <Row key={x.part.id || x.index} {...x} list={k} sel={sel} onOpen={onOpen} onPatch={onPatch} onPrint={onPrint} onSave={onSave} />)}
          {!lists[k].length && <MrtEmpty colSpan={COLS} testid={'tri-empty-' + k}>{t('tri.empty')}</MrtEmpty>}
        </React.Fragment>)}
      </tbody>
    </MrtTable>
    {ask && <SaveEachChoice parts={parts} onCancel={() => setAsk(false)} onPick={(indexes: number[], counts: any) => { setAsk(false); onSaveEach(indexes, counts); }} />}
  </div>;
}
