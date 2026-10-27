import React from 'react';
import { MRT_BTN_PRIMARY } from './mrtButtons';
import { t } from '../i18n';

export type PlainStatus = 'ready' | 'needsAnswer' | 'needsDoc' | 'notOurs';
const open = (p: any) => p.status !== 'resolved';
/** One plain status per part: not ours > needs document > needs answer > ready. */
export function plainStatus(part: any): PlainStatus {
  if (part.status === 'rejected' || part.problems.some((x: any) => open(x) && x.internal)) return 'notOurs';
  if (part.tasks.some((x: any) => x.type === 'uploadDocument' && x.status !== 'done')) return 'needsDoc';
  if (part.status === 'pending' || part.problems.some((x: any) => open(x) && (x.severity === 'Blocker' || x.severity === 'Question'))) return 'needsAnswer';
  return 'ready';
}
const TONE: Record<PlainStatus, string> = { ready: 'ready', needsAnswer: 'attention', needsDoc: 'info', notOurs: 'danger' };
export function PlainStatusBadge({ part }: { part: any }) {
  const s = plainStatus(part);
  return <span className="qr-status" data-tone={TONE[s]} data-testid="plain-status" data-status={s} title={t("ps." + s)}>{t('ps.' + s)}</span>;
}

/** First-run overlay: 3 steps, dismissed once. */
export function FirstRun({ onClose }: { onClose: () => void }) {
  return <div className="qr-modal-bg" data-testid="first-run"><div className="qr-firstrun">
    <h2>{t('fr.title')}</h2>
    <ol>{[1, 2, 3].map((n) => <li key={n}><span className="qr-step">{n}</span><div><b>{t('fr.s' + n)}</b><div className="qr-muted">{t('fr.s' + n + 't')}</div></div></li>)}</ol>
    <button className={MRT_BTN_PRIMARY} data-testid="first-run-ok" title={t('fr.tip')} onClick={onClose}>{t('fr.ok')}</button>
  </div></div>;
}
