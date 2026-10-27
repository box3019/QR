import React from 'react';
import { MRT_ACTION_BTN } from './mrtButtons';

const textOf = (c: any): string => (c == null || c === false ? '' : typeof c === 'string' || typeof c === 'number' ? String(c) : Array.isArray(c) ? c.map(textOf).join('') : '');
/** Chip: one line; long text ends with an ellipsis and the full text is in the tooltip. */
export function Chip({ t, children, testid, title }: { t: string; children: any; testid?: string; title?: string }) { return <span className="qr-chip" data-tone={t} data-testid={testid} title={title || textOf(children) || undefined}>{children}</span>; }

export function Modal({ title, children, footer, onClose, testid, wide }: any) {
  return <div className="qr-modal-bg" onClick={onClose}><div className="qr-modal" data-wide={wide ? 'true' : undefined} onClick={(e) => e.stopPropagation()} data-testid={testid}>
    <div className="qr-modal-h">{title}<span style={{ flex: 1 }} /><button className={MRT_ACTION_BTN} title="✕" aria-label="close" onClick={onClose}>✕</button></div>
    <div className="qr-modal-b">{children}</div><div className="qr-modal-f">{footer}</div></div></div>;
}
