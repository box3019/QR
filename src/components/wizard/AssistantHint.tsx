// Avatar + speech bubble beside the step title; clicking the avatar shows or hides the bubble.
import React from 'react';
import { t, tHint, getAssistantLang, assistantDir } from '../../i18n';
import { AssistantFace } from '../assistant/AssistantFace';

export function AssistantHint({ hint, on, toggle }: { hint: { key: string; vars: any } | null; on: boolean; toggle: () => void }) {
  if (!hint) return null;
  const text = tHint(hint.key, hint.vars);
  return <span className="qr-ai-hint" data-on={on}>
    <button type="button" className="qr-ai-avatar" data-testid="btn-assistant" aria-pressed={on} title={on ? t('tip.assistantHide') : t('tip.assistantShow')} onClick={toggle}><AssistantFace /></button>
    {on && <span className="qr-ai-bubble" data-testid="assistant-bubble" dir={assistantDir()} lang={getAssistantLang()} title={text}>{text}</span>}
  </span>;
}
