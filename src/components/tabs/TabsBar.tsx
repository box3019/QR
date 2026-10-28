// Project tabs at the top, MRT workspace tab strip look: label, customer, status dot or progress; drag to reorder, x to close, + for a new project.
import React, { useRef } from 'react';
import { t } from '../../i18n';

/** MRT's tab close icon (lucide X, 12 px, stroke 2.25), drawn inline. */
const CloseX = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;

export function TabsBar({ tabs, active, onSelect, onAdd, onClose, onMove }: any) {
  const from = useRef(-1); // tab drags are internal: they never reach the import drop handler
  return <div className="mrt-workspace-tab-strip qr-ptabs" dir="ltr" role="tablist" aria-label={t('tab.list')} data-testid="tabs">
    {tabs.map((tb: any, i: number) => { const on = tb.id === active; const label = tb.label || t('tab.new');
      return <div key={tb.id} className={'mrt-workspace-tab' + (on ? ' mrt-workspace-tab--active' : '')} data-testid="tab" data-id={tb.id} data-status={tb.status} data-active={on} draggable
        onDragStart={(e) => { from.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-qr-tab', String(i)); }}
        onDragOver={(e) => { if (from.current >= 0) { e.preventDefault(); e.stopPropagation(); } }}
        onDrop={(e) => { if (from.current < 0) return; e.preventDefault(); e.stopPropagation(); onMove(from.current, i); from.current = -1; }}
        onDragEnd={() => { from.current = -1; }}
        onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(tb.id); } }}>
        <button type="button" role="tab" aria-selected={on} className="mrt-workspace-tab__label" title={[label, tb.customer, t('tab.st.' + tb.status)].filter(Boolean).join(' \u00b7 ')} onClick={() => onSelect(tb.id)}>
          {tb.status === 'busy' ? <span className="qr-tab-prog" aria-hidden><span style={{ width: Math.round((tb.frac || 0) * 100) + '%' }} /></span> : <span className="qr-tab-dot" data-status={tb.status} aria-hidden />}
          <bdi>{label}</bdi>{tb.customer && <span className="qr-tab-cust"><bdi>{tb.customer}</bdi></span>}{tb.dirty && <span className="qr-tab-dirty" aria-hidden>{'\u2022'}</span>}
        </button>
        <button type="button" className="mrt-workspace-tab__close" data-testid="tab-close" title={t('tab.close')} aria-label={t('tab.close')} onClick={(e) => { e.stopPropagation(); onClose(tb.id); }}><CloseX /></button>
      </div>; })}
    <button type="button" className="mrt-workspace-tab__add" data-testid="tab-add" title={t('tab.add')} aria-label={t('tab.add')} onClick={onAdd}>+</button>
  </div>;
}
