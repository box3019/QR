// One clickable line that names the concrete next item (e.g. "3 parts need a document - start with X"); the dot uses the app-wide status colours.
import React from 'react';
import { t } from '../../i18n';

export function NextStep({ next, onGo }: any) {
  if (!next) return null;
  const v = { ...next.vars, part: next.vars.part || '' };
  return <button type="button" className="qr-next-line" data-testid="next-step" data-key={next.key} title={t('tip.nextLine')} onClick={() => onGo(next.go)}>
    <i className="qr-dot" data-s={next.dot} aria-hidden="true" /><span>{t(next.key, v)}</span><span aria-hidden className="qr-chev">{'\u203a'}</span></button>;
}
