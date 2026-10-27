import React, { useState } from 'react';
import { t } from '../i18n';

/** Editable list of aliases / spec numbers shown as chips; Enter or comma adds, × removes. */
export default function AliasChips({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.split(',').map((x) => x.trim()).filter(Boolean).filter((x) => !value.includes(x)); if (v.length) onChange([...value, ...v]); setDraft(''); };
  return <div className="qr-chips-edit">
    {value.map((a) => <span key={a} className="qr-chip qr-ltr" data-tone="neutral">{a}<button type="button" className="qr-chip-x" title={t('chips.remove')} onClick={() => onChange(value.filter((x) => x !== a))}>×</button></span>)}
    <input className="qr-chip-input" value={draft} placeholder={placeholder || t('chips.add')} onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
  </div>;
}
