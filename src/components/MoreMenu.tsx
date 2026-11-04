// One secondary-actions menu: same look as File. Items stay out of the main screen until opened.
import React, { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { MRT_BTN, MRT_ACTION_BTN_TOPBAR } from '../ui/mrtButtons';
import { Ico } from './Ico';

export function MoreMenu({ items, testid, topbar, row, label, tip }: any) {
  const [open, setOpen] = useState(false); const [pos, setPos] = useState({ top: 0, left: 0 }); const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) return; const away = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.qr-filemenu,[data-testid="' + (testid || 'btn-more') + '"]')) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('mousedown', away); window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', away); window.removeEventListener('keydown', esc); }; }, [open, testid]);
  const toggle = (e?: React.MouseEvent) => { e && e.stopPropagation(); const r = btn.current!.getBoundingClientRect(); const w = 280; setPos({ top: r.bottom + 4, left: Math.max(4, Math.min(r.left, window.innerWidth - w)) }); setOpen(!open); };
  const cls = topbar ? MRT_ACTION_BTN_TOPBAR : row ? 'qr-row-menu' : MRT_BTN;
  return <>
    <button type="button" ref={btn} className={cls} data-testid={testid || 'btn-more'} aria-haspopup="menu" aria-expanded={open} title={tip || (row ? t('tip.rowMenu') : t('tip.more'))} onClick={toggle}>
      {(topbar || row) ? <span className="ico" aria-hidden><Ico name="more" size={row ? 16 : 18} /></span> : null}{row ? null : <span>{label || t('gd.more')}</span>}
    </button>
    {open && <div className="qr-filemenu" role="menu" data-testid={(testid || 'btn-more') + '-menu'} style={{ top: pos.top, left: pos.left }}>
      {(items || []).map((it: any) => it ? <button type="button" key={it.testid || it.label} role="menuitem" className="qr-menu-item" data-testid={it.testid} disabled={it.disabled} data-active={it.active} title={it.tip || it.label} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>{it.label}</button> : null)}
    </div>}
  </>;
}
