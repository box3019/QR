// Avatar + speech bubble beside the step title; clicking the avatar shows or hides the bubble.
import React from 'react';
import { t } from '../../i18n';
import { AssistantFace } from '../assistant/AssistantFace';

export function AssistantHint({ hint, on, toggle }: { hint: { key: string; vars: any } | null; on: boolean; toggle: () => void }) {
  if (!hint) return null;
  const text = t(hint.key, hint.vars);
  return <span className="qr-ai-hint" data-on={on}>
    <button type="button" className="qr-ai-avatar" data-testid="btn-assistant" aria-pressed={on} title={on ? t('tip.assistantHide') : t('tip.assistantShow')} onClick={toggle}><AssistantFace /></button>
    {on && <span className="qr-ai-bubble" data-testid="assistant-bubble" title={text}>{text}</span>}
  </span>;
}
