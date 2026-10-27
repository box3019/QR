import React, { useState } from 'react';
import { MRT_ACTION_BTN, MRT_ACTION_BTN_PRIMARY } from '../ui/mrtButtons';
import { TUT, TLang } from './steps';

/** Step-by-step tutorial in Hebrew, Russian or English. The whole view uses one language. */
export function Tutorial({ lang0, onClose }: { lang0: string; onClose: () => void }) {
  const [lang, setLang] = useState<TLang>((['he', 'ru', 'en'].includes(lang0) ? lang0 : 'he') as TLang);
  const [i, setI] = useState(0);
  const T = TUT[lang]; const s = T.steps[i]; const last = i === T.steps.length - 1;
  return <div className="qr-modal-bg" onClick={onClose}>
    <div className="qr-modal" dir={T.dir} lang={lang} data-testid="tutorial" onClick={(e) => e.stopPropagation()}>
      <div className="qr-modal-h">{T.ui.title}<span style={{ flex: 1 }} />
        <select className="qr-input" aria-label={T.ui.lang} title={T.ui.tipLang} value={lang} data-testid="tutorial-lang" onChange={(e) => setLang(e.target.value as TLang)}>
          {(Object.keys(TUT) as TLang[]).map((k) => <option key={k} value={k}>{TUT[k].name}</option>)}
        </select>
        <button className={MRT_ACTION_BTN} title={T.ui.tipDone} aria-label={T.ui.tipDone} onClick={onClose}>✕</button></div>
      <div className="qr-modal-b">
        <div className="qr-muted" data-testid="tutorial-step">{T.ui.step} {i + 1} / {T.steps.length}</div>
        <h3 style={{ margin: '0.4em 0' }}>{s.h}</h3>
        <p style={{ lineHeight: 1.5, margin: 0 }}>{s.p}</p>
      </div>
      <div className="qr-modal-f">
        <button className={MRT_ACTION_BTN} title={T.ui.tipPrev} disabled={i === 0} data-testid="tutorial-prev" onClick={() => setI(i - 1)}>{T.ui.prev}</button>
        <span style={{ flex: 1 }} />
        <button className={MRT_ACTION_BTN_PRIMARY} title={last ? T.ui.tipDone : T.ui.tipNext} data-testid="tutorial-next" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? T.ui.done : T.ui.next}</button>
      </div>
    </div></div>;
}
