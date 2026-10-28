// Settings > Language: the ONE place to choose the program language (menus and screens). Large radio cards with native names.
import React from 'react';
import { t } from '../i18n';

export const PROGRAM_LANGS = [{ id: 'en', name: 'English', code: 'EN' }, { id: 'he', name: '\u05e2\u05d1\u05e8\u05d9\u05ea', code: 'HE' }, { id: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', code: 'RU', soon: true }];

export default function LanguagePanel({ value, onPick }: { value: string; onPick: (l: string) => void }) {
  return <div className="qr-langpanel" data-testid="language-panel">
    <h3 className="qr-lang-h">{t('st.uiLang')}</h3>
    <p className="qr-muted qr-lang-note" data-testid="language-note">{t('st.langExplain')}</p>
    <div className="qr-langcards" role="radiogroup" aria-label={t('st.uiLang')} data-testid="lang-cards">
      {PROGRAM_LANGS.map((l) => <button key={l.id} type="button" role="radio" aria-checked={value === l.id} aria-disabled={!!l.soon} className="qr-langcard" data-active={value === l.id} data-soon={!!l.soon} data-testid={'lang-' + l.id}
        title={l.soon ? t('st.langSoon') : t('tip.langCard', { name: l.name })} onClick={() => { if (!l.soon) onPick(l.id); }}>
        <span className="qr-langcard-code">{l.code}</span><bdi className="qr-langcard-name">{l.name}</bdi>
        <span className="qr-langcard-st">{l.soon ? t('st.langSoonShort') : value === l.id ? t('st.langCurrent') : ''}</span>
      </button>)}
    </div>
  </div>;
}
