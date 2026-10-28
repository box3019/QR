// History: the last 20 opened RFQs/projects. Search by RFQ, part number or customer; one click reopens it (or focuses
// its tab) at the same step and state. 'Remove from history' asks before deleting the saved data.
import React, { useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN } from '../../ui/mrtButtons';
import { filterHistory } from '../../projects/history.mjs';
import { when } from './when';
import { useFloat } from '../../ui/useFloat';

const GROUPS = ['ready', 'needsDoc', 'needsAnswer', 'notOurs'];
export function HistoryDialog({ items, openIds, onOpen, onRemove, onClose }: any) {
  const [q, setQ] = useState('');
  const f = useFloat('modal:history', 'offset');
  const list = filterHistory(items, q);
  const remove = (e: any) => { if (openIds.includes(e.id)) { onRemove(e.id, false); return; } onRemove(e.id, confirm(t('hist.deleteAsk', { name: e.label || t('tab.new') }))); };
  return <div className="qr-modal-bg" data-testid="history" onClick={onClose}><div className="qr-modal qr-hist" ref={f.ref} style={f.style} role="dialog" aria-modal="true" aria-label={t('hist.title')} onClick={(e) => e.stopPropagation()}>
    <div className="qr-modal-h" title={t('tip.drag')} {...f.headProps}><span>{t('hist.title')}</span><button type="button" className={MRT_BTN} title={t('wz.close')} data-testid="history-close" onClick={onClose}>{t('wz.close')}</button></div>
    <div className="qr-hist-search"><input className="qr-input" data-testid="history-search" autoFocus value={q} placeholder={t('hist.search')} title={t('hist.search')} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="qr-hist-body">{list.length ? <table className="qr-hist-t"><thead><tr><th>{t('hist.rfq')}</th><th>{t('hist.customer')}</th><th>{t('wz.parts')}</th><th>{t('hist.status')}</th><th>{t('hist.opened')}</th><th>{t('hist.step')}</th><th /></tr></thead>
      <tbody>{list.map((e: any) => <tr key={e.id} data-testid="history-row" data-id={e.id}>
        <td><button type="button" className="qr-hist-open" data-testid="history-open" title={t('hist.tipOpen')} onClick={() => onOpen(e.id)}><bdi>{e.label || t('tab.new')}</bdi></button>{openIds.includes(e.id) && <span className="qr-muted"> {t('hist.isOpen')}</span>}</td>
        <td><bdi>{e.customer}</bdi></td><td>{e.nParts}</td>
        <td className="qr-hist-g">{GROUPS.filter((g) => e.groups && e.groups[g]).map((g) => <span key={g} className="qr-sum-g" data-g={g}>{t('pg.' + g)} {e.groups[g]}</span>)}</td>
        <td>{when(e.opened)}</td><td>{t('hist.stepN', { n: e.step })}</td>
        <td><button type="button" className={MRT_BTN} data-testid="history-remove" title={t('hist.tipRemove')} onClick={() => remove(e)}>{t('hist.remove')}</button></td>
      </tr>)}</tbody></table> : <p className="qr-muted" data-testid="history-empty">{t(items.length ? 'hist.noMatch' : 'hist.empty')}</p>}</div>
  </div></div>;
}
