// File menu in the top bar: Save, Save as and Open under ONE button (MRT style). Items that cannot work now are disabled and say why in their tooltip.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { MRT_ACTION_BTN_TOPBAR } from '../ui/mrtButtons';
import { Ico } from './Ico';

export function FileMenu({ why, status, at, onSave, onSaveAs, onOpen }: any) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const btn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.qr-filemenu,[data-testid=btn-file]')) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !btn.current || !menuRef.current) return;
    const update = () => {
      if (!btn.current || !menuRef.current) return;
      const r = btn.current.getBoundingClientRect();
      const m = menuRef.current.getBoundingClientRect();
      const pad = 8;
      const w = m.width || 280;
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

  const toggle = () => { setOpen(!open); };
  const saved = status === 'saved' && at;
  const pick = (f: () => void) => () => { setOpen(false); f(); };
  const item = (testid: string, icon: string, label: string, tip: string, hint: string, disabled: boolean, f: () => void) =>
    <button type="button" role="menuitem" className="qr-menu-item" data-testid={testid} disabled={disabled} title={tip} onClick={pick(f)}><span className="ico" aria-hidden><Ico name={icon as any} /></span><span className="qr-menu-l">{label}</span><span className="qr-menu-k qr-ltr">{hint}</span></button>;

  return <>
    <button type="button" ref={btn} className={MRT_ACTION_BTN_TOPBAR + ' mrt-topbar-menu-trigger'} data-testid="btn-file" aria-haspopup="menu" aria-expanded={open} title={saved ? t('tip.fileSaved', { time: at }) : t('tip.file')} onClick={toggle}><span className="ico mrt-topbar-cmd-icon" aria-hidden><Ico name="save" size={22} /></span><span className="mrt-topbar-cmd-label-row"><span className="mrt-topbar-cmd-label">{t('top.file')}</span><span className="mrt-topbar-cmd-chevron" aria-hidden><Ico name="chevron" size={12} /></span></span></button>
    {open && <div ref={menuRef} className="qr-filemenu" role="menu" data-testid="file-menu" style={{ top: pos.top, left: pos.left }}>
      {item('btn-save', 'save', t('top.save'), why ? t(why) : saved ? t('tip.saveAgain', { time: at }) : t('tip.save'), t('menu.hint.save'), !!why, onSave)}
      {item('btn-save-as', 'saveas', t('top.saveAs'), why ? t(why) : t('tip.saveAs'), t('menu.hint.saveAs'), !!why, onSaveAs)}
      {item('btn-open-project', 'open', t('top.open'), t('tip.open'), t('menu.hint.open'), false, onOpen)}
    </div>}
  </>;
}
