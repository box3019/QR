// MRT print dialog for selected part drawings: printer, A3/A4, fit, copies, preview, Print/Cancel on the side panel.
import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { MRT_ACTION_BTN, MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { normalizeCopies, normalizePaperSize, pickDefaultPrinter, printDrawingsPlan, printPayloadOf } from '../../parts/printDrawings.mjs';

function qr() { return (window as any).qr; }

export function PrintDrawingsDialog({ parts, files, onClose, onDone }: any) {
  const plan = useMemo(() => printDrawingsPlan(parts, files), [parts, files]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [printer, setPrinter] = useState('');
  const [paper, setPaper] = useState('A4');
  const [fit, setFit] = useState(true);
  const [copies, setCopies] = useState(1);
  const [thumbs, setThumbs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    Promise.resolve(qr()?.getSettings?.()).then((s: any) => {
      if (!live) return;
      setPaper(normalizePaperSize(s && s.lastPaperSize));
      const last = (s && s.lastPrinter) || '';
      Promise.resolve(qr()?.printers?.()).then((r: any) => {
        if (!live) return;
        const list = (r && r.printers) || [];
        setPrinters(list);
        setPrinter(pickDefaultPrinter(list, last));
      }).catch(() => { if (live) setPrinters([]); });
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const out: any[] = [];
    (async () => {
      for (const file of plan.files) {
        const n = Math.max(1, Number(file.pages) || 1);
        for (let page = 1; page <= n; page++) {
          let png = '';
          try {
            const r = await qr()?.preview?.(file.path, page, 480);
            png = (r && r.png) || '';
          } catch { png = ''; }
          if (!live) return;
          out.push({ key: file.path + '#' + page, partNo: file.partNo, name: file.name, page, pages: n, png });
        }
      }
      if (live) setThumbs(out);
    })();
    return () => { live = false; };
  }, [plan.files]);

  const go = async () => {
    if (!plan.files.length || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await qr()?.printDrawings?.(printPayloadOf(plan, { printer, paperSize: paper, copies, fit }));
      if (r && r.ok === false) { setErr(r.error || t('print.failed')); setBusy(false); return; }
      onDone(r);
    } catch (e: any) {
      setErr((e && e.message) || t('print.failed'));
      setBusy(false);
    }
  };

  const pageLabel = plan.pages === 1 ? t('print.pagesOne') : t('print.pages', { n: plan.pages });

  return <div className="qr-modal-bg" data-testid="print-drawings" onClick={onClose}>
    <div className="qr-modal qr-print-draw-modal" data-wide="true" role="dialog" aria-modal="true" aria-label={t('print.drawings')} onClick={(e) => e.stopPropagation()}>
      <div className="qr-modal-h">{t('print.drawings')}<span style={{ flex: 1 }} /><button type="button" className={MRT_ACTION_BTN} title="✕" aria-label="close" onClick={onClose}>✕</button></div>
      <div className="qr-print-draw">
        <aside className="qr-print-draw-side">
          <label className="qr-print-field">{t('print.printer')}
            <select data-testid="print-drawings-printer" value={printer} onChange={(e) => setPrinter(e.target.value)} title={t('print.printer')}>
              {!printers.length && <option value="">{t('print.noPrinters')}</option>}
              {printers.map((p: any) => <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? ' · ' + t('print.defaultPrinter') : ''}</option>)}
            </select>
          </label>
          <label className="qr-print-field">{t('print.paper')}
            <select data-testid="print-drawings-paper" value={paper} onChange={(e) => setPaper(normalizePaperSize(e.target.value))} title={t('print.paper')}>
              <option value="A4">{t('print.paperA4')}</option>
              <option value="A3">{t('print.paperA3')}</option>
            </select>
          </label>
          <label className="qr-print-check"><input type="checkbox" data-testid="print-drawings-fit" checked={fit} onChange={(e) => setFit(e.target.checked)} />{t('print.fit')}</label>
          <label className="qr-print-field">{t('print.copies')}
            <input type="number" data-testid="print-drawings-copies" min={1} max={99} value={copies} onChange={(e) => setCopies(normalizeCopies(e.target.value))} title={t('print.copies')} />
          </label>
          <div className="qr-print-field"><span>{t('print.orientation')}</span><span data-testid="print-drawings-orient">{t('print.orientationAuto')}</span></div>
          {!!plan.missing.length && <div className="qr-print-missing" data-testid="print-drawings-missing">
            <div className="qr-print-missing-h">{t('print.missing')}</div>
            <ul>{plan.missing.map((m: any) => <li key={m.index}><bdi className="qr-ltr">{m.partNo || t('print.missingOne')}</bdi></li>)}</ul>
          </div>}
          {!plan.files.length && <p className="qr-print-empty" data-testid="print-drawings-empty">{t('print.noneReady')}</p>}
          {err ? <p className="qr-print-err" data-testid="print-drawings-err">{err}</p> : null}
          <div className="qr-print-draw-actions">
            <button type="button" className={MRT_BTN} data-testid="print-drawings-cancel" title={t('st.cancel')} onClick={onClose}>{t('st.cancel')}</button>
            <button type="button" className={MRT_BTN_PRIMARY} data-testid="print-drawings-go" title={t('print.go')} disabled={!plan.files.length || busy} onClick={go}>{busy ? t('print.printing') : t('print.go')}</button>
          </div>
        </aside>
        <div className="qr-print-draw-preview" data-testid="print-drawings-preview">
          <div className="qr-print-preview-h">{t('print.preview')} · {pageLabel}</div>
          <div className="qr-print-thumbs">
            {thumbs.map((x) => <figure key={x.key} className="qr-print-thumb">
              {x.png ? <img src={x.png} alt="" /> : <div className="qr-print-thumb-empty" />}
              <figcaption><bdi className="qr-ltr">{x.partNo || x.name}</bdi> · {t('dw.sheet', { n: x.page })}</figcaption>
            </figure>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}
