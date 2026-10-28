// Settings > Interface: "Built-in visual presets", laid out like MRT's presets screen (QR's own implementation, no MRT code).
// Intro + quick chip row, then one card per preset with a mini QR UI mock (top bar, input, table, status bars), the SELECTED badge,
// click = live preview, Apply = commit. The mock reads the preset's own tokens (src/styles/themes.css) through themeAttrs().
import React from 'react';
import { MRT_ACTION_BTN, MRT_BTN_PRIMARY } from '../ui/mrtButtons';
import { t } from '../i18n';
import { PALETTES, themeAttrs } from '../theme/themes';

export function PresetMock({ id }: { id: string }) {
  return <span className="qr-mock qr-pal-prev" {...themeAttrs({ palette: id, accent: 'slate' })} aria-hidden="true" data-testid={'mock-' + id}>
    <span className="qm-top"><i /><i /><i /></span>
    <span className="qm-input"><i className="qm-line" /></span>
    <span className="qm-input"><i className="qm-line" /><i className="qm-chev" /></span>
    <span className="qm-grid"><i /><i data-m="1" /><i /><i /><i data-m="1" /><i data-a="1">01</i></span>
    <span className="qm-txt"><b>Aa</b><em>{t("st.mockMuted")}</em></span>
    <span className="qm-st"><i data-s="warn" /><i data-s="bad" /><i data-s="ok" /></span>
  </span>;
}

export default function PresetsPanel({ committed, previewed, onPreview, onApply }: { committed: string; previewed: string; onPreview: (id: string) => void; onApply: () => void }) {
  const key = (id: string) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPreview(id); } };
  return <div className="qr-presets" data-testid="presets">
    <div className="qr-pres-intro">
      <p>{t('st.presetsIntro')}</p>
      <div className="qr-pres-chips" data-testid="preset-chips">{PALETTES.map((id) => <button key={id} type="button" className={MRT_ACTION_BTN} data-active={previewed === id} data-testid={'chip-' + id} title={t('tip.presetChip')} onClick={() => onPreview(id)}>{t('pal.' + id)}</button>)}</div>
    </div>
    <h3 className="qr-pres-title">{t('st.presetsTitle')}</h3>
    <p className="qr-pres-sub">{t('st.presetsSub')}</p>
    <div className="qr-pcards" role="radiogroup" aria-label={t('st.presetsTitle')} data-testid="palettes">
      {PALETTES.map((id) => <div key={id} role="radio" tabIndex={0} aria-checked={committed === id} className="qr-pcard qr-pal-prev" {...themeAttrs({ palette: id, accent: 'slate' })} data-preview={previewed === id} data-selected={committed === id} data-testid={'pal-' + id} title={t('tip.presetCard')} onClick={() => onPreview(id)} onKeyDown={key(id)}>
        {committed === id && <span className="qr-pcard-badge" data-testid="selected-badge">{t('st.presetSelected')}</span>}
        <PresetMock id={id} />
        <span className="qr-pcard-name">{t('pal.' + id)}</span>
        <span className="qr-pcard-desc">{t('pald.' + id)}</span>
        <span className="qr-pcard-tag">{t('st.presetBuiltin')}</span>
      </div>)}
    </div>
    <div className="qr-pres-bar" data-testid="preset-bar"><span className="qr-pres-state" data-testid="preset-state">{t(previewed === committed ? 'st.presetApplied' : 'st.presetPreviewing', { name: t('pal.' + previewed) })}</span>
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="preset-apply" disabled={previewed === committed} title={previewed === committed ? t('dis.presetSame') : t('tip.presetApply')} onClick={onApply}>{t('st.presetApply')}</button></div>
  </div>;
}
