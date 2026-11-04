// History: the last 20 opened RFQs/projects. Search by RFQ, part number or customer; one click reopens it (or focuses
// its tab) at the same step and state. 'Remove from history' asks before deleting the saved data.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN } from '../../ui/mrtButtons';
import { filterHistory } from '../../projects/history.mjs';
import { when } from './when';
import { useFloat } from '../../ui/useFloat';
import { MrtTable, MrtHead, MrtEmpty, MrtRow } from '../../ui/MrtTable';
import { MoreMenu } from '../MoreMenu';

const GROUPS = ['ready', 'needsDoc', 'needsAnswer', 'notOurs'];
export function HistoryDialog({ items, openIds, onOpen, onRemove, onClose }: any) {
  const [q, setQ] = useState('');
  const f = useFloat('modal:history', 'offset');
  const list = filterHistory(items, q);
  const remove = (e: any) => { if (openIds.includes(e.id)) { onRemove(e.id, false); return; } onRemove(e.id, confirm(t('hist.deleteAsk', { name: e.label || t('tab.new') }))); };
  return <div className="qr-modal-bg" data-testid="history" onClick={onClose}><div className="qr-modal qr-hist" ref={f.ref} style={f.style} role="dialog" aria-modal="true" aria-label={t('hist.title')} onClick={(e) => e.stopPropagation()}>
    <div className="qr-modal-h" title={t('tip.drag')} {...f.headProps}><span>{t('hist.title')}</span><button type="button" className={MRT_BTN} title={t('wz.close')} data-testid="history-close" onClick={onClose}>{t('wz.close')}</button></div>
    <div className="qr-hist-search"><input className="qr-input" data-testid="history-search" autoFocus value={q} placeholder={t('hist.search')} title={t('hist.search')} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="qr-hist-body"><MrtTable shell className="qr-hist-t" cols={<colgroup><col className="qr-mrt-c-text" /><col className="qr-mrt-c-id" /><col className="qr-mrt-c-status" /><col className="qr-mrt-c-text" /><col className="qr-mrt-c-id" /><col className="qr-mrt-c-status" /><col className="qr-mrt-c-menu" /></colgroup>}><MrtHead cells={[t('hist.rfq'), t('hist.customer'), t('wz.parts'), t('hist.status'), t('hist.opened'), t('hist.step'), '']} />
      <tbody>{list.length ? list.map((e: any) => <MrtRow key={e.id} data-testid="history-row" data-id={e.id}>
        <td><button type="button" className="qr-hist-open" data-testid="history-open" title={t('hist.tipOpen')} onClick={() => onOpen(e.id)}><bdi>{e.label || t('tab.new')}</bdi></button>{openIds.includes(e.id) && <span className="qr-muted"> {t('hist.isOpen')}</span>}</td>
        <td><bdi>{e.customer}</bdi></td><td>{e.nParts}</td>
        <td className="qr-hist-g">{GROUPS.filter((g) => e.groups && e.groups[g]).map((g) => <span key={g} className="qr-sum-g" data-g={g}>{t('pg.' + g)} {e.groups[g]}</span>)}</td>
        <td>{when(e.opened)}</td><td>{t('hist.stepN', { n: e.step })}</td>
        <td><MoreMenu row testid={'hist-more-' + e.id} items={[{ testid: 'history-remove', label: t('hist.remove'), tip: t('hist.tipRemove'), onClick: () => remove(e) }]} /></td>
      </MrtRow>) : <MrtEmpty colSpan={7} testid="history-empty">{t(items.length ? 'hist.noMatch' : 'hist.empty')}</MrtEmpty>}</tbody></MrtTable></div>
  </div></div>;
}
