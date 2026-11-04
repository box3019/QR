// Shared MRT item table: header row, group headers, compact rows, overflow expand (never ellipsis).
import React, { useLayoutEffect, useRef, useState } from 'react';
import { t } from '../i18n';

export function OverflowLine({ className, testid, text, children }: { className?: string; testid?: string; text: string; children?: any }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => { setOver(el.scrollWidth > el.clientWidth + 1); };
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const host = el.closest('td, th') || el.parentElement;
    if (host) ro.observe(host);
    return () => ro.disconnect();
  }, [text]);
  if (!text) return <span className={className} data-testid={testid}>{children}</span>;
  return <span className="qr-ck-line" data-overflow={over ? '1' : undefined} data-open={open ? '1' : undefined}>
    <span ref={ref} className={className} data-testid={testid} title={text}>{children ?? text}</span>
    {over ? <button type="button" className="qr-ck-more" data-testid="ck-expand" aria-expanded={open} title={open ? t('ck.valueHide') : t('ck.valueFull')} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{open ? '\u25BE' : '\u25B8'}</button> : null}
    {open ? <span className="qr-ck-full" data-testid="ck-full">{text}</span> : null}
  </span>;
}

export function MrtTable({ children, className, testid, tableRef, tabIndex, cols, ...rest }: any) {
  return <table className={'qr-mrt' + (className ? ' ' + className : '')} data-mrt="1" data-testid={testid} ref={tableRef} tabIndex={tabIndex} {...rest}>
    {cols}
    {children}
  </table>;
}

export function MrtHead({ cells }: { cells: any[] }) {
  return <thead><tr>{cells.map((c, i) => {
    if (c && typeof c === 'object' && !React.isValidElement(c) && ('label' in c || 'title' in c || 'className' in c)) {
      return <th key={i} className={c.className} title={c.title}>{c.label}</th>;
    }
    return <th key={i}>{c}</th>;
  })}</tr></thead>;
}

export function MrtGroup({ children, colSpan, testid, className }: any) {
  return <tr className={'qr-mrt-gh' + (className ? ' ' + className : '')}><th colSpan={colSpan} data-testid={testid}>{children}</th></tr>;
}

export function MrtRow({ children, className, active, ...rest }: any) {
  const on = active === true || active === 'true';
  return <tr className={'qr-mrt-row' + (className ? ' ' + className : '')} data-active={on ? 'true' : undefined} {...rest}>{children}</tr>;
}
