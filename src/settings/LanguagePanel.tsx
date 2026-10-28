// Settings > Language: the ONE place to choose the program language (menus and screens). A normal settings row: label, compact dropdown, one muted help line.
import React from 'react';
import { t } from '../i18n';

// Program languages with their native names. Russian is listed but not selectable: the screens exist in English and Hebrew only (Russian is an assistant language).
export const PROGRAM_LANGS = [{ id: 'en', name: 'English' }, { id: 'he', name: '\u05e2\u05d1\u05e8\u05d9\u05ea' }, { id: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', soon: true }];

export default function LanguagePanel({ value, onPick }: { value: string; onPick: (l: string) => void }) {
  return <div className="qr-field" data-testid="language-panel">
    <label htmlFor="ui-lang">{t('st.uiLang')}</label>
    <div>
      <select id="ui-lang" className="qr-input" value={value} data-testid="ui-lang" onChange={(e) => onPick(e.target.value)}>
        {PROGRAM_LANGS.map((l) => <option key={l.id} value={l.id} disabled={!!l.soon} title={l.soon ? t('st.langSoon') : undefined}>{l.name}</option>)}
      </select>
      <div className="qr-muted" data-testid="language-note">{t('st.langExplain')}</div>
    </div>
  </div>;
}
