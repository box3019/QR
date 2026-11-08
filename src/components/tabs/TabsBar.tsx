// Project tabs at the top, MRT workspace tab strip look: label, customer, status dot or progress; drag to reorder, x to close, + for a new project.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { tabFitCount, visibleTabIds } from '../../projects/store.mjs';

/** Text × so the glyph paints on Windows (SVG currentColor was in the DOM but not drawn). */
const CloseX = () => <span className="qr-tab-x" aria-hidden="true">{'\u00d7'}</span>;

function TabChip({ tb, on, onSelect, onClose, onMenu, onMove, from }: any) {
  const label = tb.label || t('tab.new');
  return <div className={'mrt-workspace-tab' + (on ? ' mrt-workspace-tab--active' : '')} data-testid="tab" data-id={tb.id} data-status={tb.status} data-active={on} draggable
    onDragStart={(e) => { from.current = tb._i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-qr-tab', String(tb._i)); }}
    onDragOver={(e) => { if (from.current >= 0) { e.preventDefault(); e.stopPropagation(); } }}
    onDrop={(e) => { if (from.current < 0) return; e.preventDefault(); e.stopPropagation(); onMove(from.current, tb._i); from.current = -1; }}
    onDragEnd={() => { from.current = -1; }}
    onContextMenu={(e) => { e.preventDefault(); onMenu(tb.id, e.clientX, e.clientY); }}
    onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(tb.id); } }}>
    <button type="button" role="tab" aria-selected={on} className="mrt-workspace-tab__label" title={[label, tb.customer, t('tab.st.' + tb.status)].filter(Boolean).join(' \u00b7 ')} onClick={() => onSelect(tb.id)}>
      {tb.status === 'busy' ? <span className="qr-tab-prog" aria-hidden><span style={{ width: Math.round((tb.frac || 0) * 100) + '%' }} /></span> : <span className="qr-tab-dot" data-status={tb.status} aria-hidden />}
      <bdi>{label}</bdi>{tb.customer && <span className="qr-tab-cust"><bdi>{tb.customer}</bdi></span>}{tb.unsaved && tb.nParts > 0 && <span className="qr-tab-dirty" data-testid="tab-unsaved" title={t('tab.unsaved')} aria-label={t('tab.unsaved')}>{'\u25cf'}</span>}
    </button>
    <button type="button" className="mrt-workspace-tab__close" data-testid="tab-close" title={t('tab.close')} aria-label={t('tab.close')} onClick={(e) => { e.stopPropagation(); onClose(tb.id); }}><CloseX /></button>
  </div>;
}

export function TabsBar({ tabs, active, onSelect, onAdd, onClose, onCloseOthers, onCloseAll, onMove }: any) {
  const from = useRef(-1); // tab drags are internal: they never reach the import drop handler
  const strip = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const hideSingleEmpty = tabs.length === 1 && tabs[0].status === 'empty' && !tabs[0].label && !(tabs[0].nParts > 0);
  const visibleTabs = hideSingleEmpty ? [] : tabs;
  const [maxN, setMaxN] = useState(visibleTabs.length || 1);
  const [menu, setMenu] = useState(null as null | { id: string; x: number; y: number; more?: boolean });
  const ids = visibleTabs.map((tb: any) => tb.id);
  const fit = () => {
    const el = strip.current; if (!el) return;
    const bar = (el.closest('.qr-tabrow') || el.closest('.qr-topbar')) as HTMLElement | null;
    const addW = addRef.current ? addRef.current.getBoundingClientRect().width + 8 : 32;
    const moreW = moreRef.current ? moreRef.current.getBoundingClientRect().width + 8 : 120;
    const sample = el.querySelector('.mrt-workspace-tab') as HTMLElement | null;
    const tabW = sample ? Math.max(96, sample.getBoundingClientRect().width) : 160;
    let width = el.clientWidth;
    if (bar) {
      const gap = parseFloat(getComputedStyle(bar).columnGap || getComputedStyle(bar).gap) || 8;
      let used = 0, nVis = 0;
      for (const child of Array.from(bar.children) as HTMLElement[]) {
        const cs = getComputedStyle(child);
        if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute') continue;
        nVis++;
        if (child === el || child.classList.contains('qr-ptabs')) continue;
        used += child.getBoundingClientRect().width;
      }
      width = Math.max(0, Math.min(el.clientWidth || bar.clientWidth, bar.clientWidth - used - gap * Math.max(0, nVis - 1)));
    }
    setMaxN(tabFitCount(width, tabW, addW, moreW, visibleTabs.length));
  };
  useLayoutEffect(fit, [visibleTabs.length, visibleTabs.map((tb: any) => tb.label + tb.customer).join('|')]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const el = strip.current; const bar = el && (el.closest('.qr-tabrow') || el.closest('.qr-topbar'));
    const ro = new ResizeObserver(fit);
    if (el) ro.observe(el); if (bar) ro.observe(bar);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [visibleTabs.length]);
  const { shown, rest } = visibleTabIds(ids, active, maxN);
  const byId = Object.fromEntries(visibleTabs.map((tb: any, i: number) => [tb.id, { ...tb, _i: i }]));
  const shownTabs = shown.map((id: string) => byId[id]).filter(Boolean);
  const restTabs = rest.map((id: string) => byId[id]).filter(Boolean);
  useEffect(() => { if (!menu) return;
    const away = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.qr-tab-menu,[data-testid=tab-more]')) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('mousedown', away); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', away); window.removeEventListener('keydown', esc); };
  }, [menu]);
  const openMenu = (id: string, x: number, y: number, more?: boolean) => setMenu({ id, x: Math.max(4, Math.min(x, window.innerWidth - 260)), y, more });
  const item = (testid: string, label: string, fn: () => void) =>
    <button type="button" role="menuitem" className="qr-menu-item" data-testid={testid} title={label} onClick={() => { setMenu(null); fn(); }}>{label}</button>;
  return <div className="mrt-workspace-tab-strip qr-ptabs" dir="ltr" role="tablist" aria-label={t('tab.list')} data-testid="tabs" ref={strip}>
    {shownTabs.map((tb: any) => <TabChip key={tb.id} tb={tb} on={tb.id === active} onSelect={onSelect} onClose={onClose} onMenu={openMenu} onMove={onMove} from={from} />)}
    {!!restTabs.length && <button type="button" ref={moreRef} className="qr-tab-more" data-testid="tab-more" title={t('tip.tabMore')} aria-label={t('tab.more')} aria-haspopup="menu" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); openMenu(restTabs[0].id, r.left, r.bottom + 4, true); }}>{t('tab.more')}</button>}
    <button type="button" ref={addRef} className="mrt-workspace-tab__add" data-testid="tab-add" title={t('tab.add')} aria-label={t('tab.add')} onClick={onAdd}>+</button>
    {menu && <div className="qr-filemenu qr-tab-menu" role="menu" data-testid="tab-menu" style={{ top: menu.y, left: menu.x }}>
      {menu.more && restTabs.map((tb: any) => <div key={tb.id} className="qr-more-job">
        <button type="button" role="menuitem" className="qr-menu-item" data-testid="tab-more-item" data-id={tb.id} title={[tb.label || t('tab.new'), tb.customer].filter(Boolean).join(' ')} onClick={() => { setMenu(null); onSelect(tb.id); }}>
          <bdi>{tb.label || t('tab.new')}</bdi>{tb.customer ? <span className="qr-tab-cust"> <bdi>{tb.customer}</bdi></span> : null}
        </button>
        <button type="button" className="mrt-workspace-tab__close" data-testid="tab-more-close" title={t('tab.close')} aria-label={t('tab.close')} onClick={() => { setMenu(null); onClose(tb.id); }}><CloseX /></button>
      </div>)}
      {!menu.more && item('tab-menu-close', t('tab.close'), () => onClose(menu.id))}
      {item('tab-menu-close-others', t('tab.closeOthers'), () => onCloseOthers(menu.more ? active : menu.id))}
      {item('tab-menu-close-all', t('tab.closeAll'), () => onCloseAll())}
    </div>}
  </div>;
}
