import React from 'react';
import { MRT_ACTION_BTN } from './mrtButtons';

export function Chip({ t, children, testid }: { t: string; children: any; testid?: string }) { return <span className="qr-chip" data-tone={t} data-testid={testid}>{children}</span>; }

export function Modal({ title, children, footer, onClose, testid, wide }: any) {
  return <div className="qr-modal-bg" onClick={onClose}><div className="qr-modal" data-wide={wide ? 'true' : undefined} onClick={(e) => e.stopPropagation()} data-testid={testid}>
    <div className="qr-modal-h">{title}<span style={{ flex: 1 }} /><button className={MRT_ACTION_BTN} onClick={onClose}>✕</button></div>
    <div className="qr-modal-b">{children}</div><div className="qr-modal-f">{footer}</div></div></div>;
}
