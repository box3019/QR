// Summary tiles: a count and a label per status group. Not buttons: a quiet card that filters the list on click.
import React from 'react';
import { t } from '../i18n';
import { GROUP_ORDER, DOT } from '../parts/groups.mjs';

export function Tiles({ counts, active, onPick }: { counts: Record<string, number>; active: string | null; onPick: (k: string | null) => void }) {
  return <div className="qr-tiles" data-testid="tiles" role="group">
    {GROUP_ORDER.map((k: string) => <div key={k} className="qr-tile" role="switch" aria-checked={active === k} tabIndex={0} data-testid={'tile-' + k} data-k={k} data-active={active === k} data-zero={!counts[k]}
      title={t('tip.tile')} onClick={() => onPick(active === k ? null : k)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(active === k ? null : k); } }}>
      <span className="qr-tile-n" data-testid={'tile-n-' + k}>{counts[k]}</span>
      <span className="qr-tile-l"><i className="qr-dot" data-s={DOT[k]} aria-hidden="true" />{t('tile.' + k)}</span>
    </div>)}
  </div>;
}
