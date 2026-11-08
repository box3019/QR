// One secondary-actions menu: same look as File. Items stay out of the main screen until opened.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { MRT_BTN, MRT_ACTION_BTN_TOPBAR } from '../ui/mrtButtons';
import { Ico } from './Ico';

export function MoreMenu({ items, testid, topbar, row, label, tip }: any) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const btn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.qr-filemenu,[data-testid="' + (testid || 'btn-more') + '"]')) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [open, testid]);

  useLayoutEffect(() => {
    if (!open || !btn.current || !menuRef.current) return;
    const update = () => {
      if (!btn.current || !menuRef.current) return;
      const r = btn.current.getBoundingClientRect();
      const m = menuRef.current.getBoundingClientRect();
      const pad = 8;
      const w = m.width || 240;
      const h = m.height || 160;

      let top = r.bottom + 4;
      if (top + h > window.innerHeight - pad) {
        if (r.top - 4 - h >= pad) {
          top = r.top - 4 - h;
        } else {
          top = Math.max(pad, window.innerHeight - h - pad);
        }
      }

      let left = Math.max(pad, Math.min(r.left, window.innerWidth - w - pad));
      setPos({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  const toggle = (e?: React.MouseEvent) => {
    e && e.stopPropagation();
    setOpen(!open);
  };

  const cls = topbar ? MRT_ACTION_BTN_TOPBAR + ' mrt-topbar-menu-trigger' : row ? 'qr-row-menu' : MRT_BTN;
  return <>
    <button type="button" ref={btn} className={cls} data-testid={testid || 'btn-more'} aria-haspopup="menu" aria-expanded={open} title={tip || (row ? t('tip.rowMenu') : t('tip.more'))} onClick={toggle}>
      {(topbar || row) ? <span className={'ico' + (topbar ? ' mrt-topbar-cmd-icon' : '')} aria-hidden><Ico name="more" size={row ? 16 : 22} /></span> : null}{row ? null : (topbar ? <span className="mrt-topbar-cmd-label-row"><span className="mrt-topbar-cmd-label">{label || t('gd.more')}</span><span className="mrt-topbar-cmd-chevron" aria-hidden><Ico name="chevron" size={12} /></span></span> : <span>{label || t('gd.more')}</span>)}
    </button>
    {open && <div ref={menuRef} className="qr-filemenu" role="menu" data-testid={(testid || 'btn-more') + '-menu'} style={{ top: pos.top, left: pos.left }}>
      {(items || []).map((it: any) => it ? <button type="button" key={it.testid || it.label} role="menuitem" className="qr-menu-item" data-testid={it.testid} disabled={it.disabled} data-active={it.active} title={it.tip || it.label} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>{it.label}</button> : null)}
    </div>}
  </>;
}
