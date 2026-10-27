// Step 2 part card (approved design, analysis.md 'Proposal for QR'): flags on top, then the friend's sections
// (material, heat treat, coatings, paint, masking, operation sequence), one line each, one action each; click = show source on the drawing.
import React, { useState } from 'react';
import { t, getLang } from '../i18n';
import { Chip, Modal } from '../ui/common';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../ui/mrtButtons';
import { SECTIONS, DETAIL_ONLY, sectionRows, flagKeys, sectionLine, sectionStds, sectionFlags, sectionAction, locate } from '../parts/breakdown.mjs';

const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
const FTONE: any = { multi: 'danger', noStd: 'danger', noCoating: 'attention', location: 'attention', assembly: 'attention' };

function Flags({ text }: { text: string }) {
  const keys = flagKeys(text);
  return <span className="qr-row" data-testid="bd-flags">{keys.map((k) => <Chip key={k} t={FTONE[k]} testid={'flag-' + k}>{t('bd.flag.' + k)}</Chip>)}{!keys.length && text ? <bdi>{text}</bdi> : null}</span>;
}
function Value({ f, row }: any) {
  const v = L(row, f);
  if (f === 'flags') return <Flags text={row.flags} />;
  if (f === 'stds' || f === 'typecls' || f === 'no' || f === 'catno') return <span className="qr-ltr">{String(v)}</span>;
  return <bdi>{String(v)}</bdi>;
}
function Fields({ sec, rows, details }: any) {
  const fields = sec.fields.filter((f: string) => (details || !DETAIL_ONLY.has(f)));
  return <>{rows.map((r: any, j: number) => <dl key={j} className="qr-bd-row" data-testid={'bd-row-' + sec.key}>
    {fields.filter((f: string) => r[f] !== '' && r[f] != null && !(f === 'flagged' && !r[f])).map((f: string) => <React.Fragment key={f}><dt>{t('bd.f.' + f)}</dt><dd data-field={f}><Value f={f} row={r} /></dd></React.Fragment>)}
  </dl>)}</>;
}

/** Raw NOTES / routing rows (the friend's Requirements sheet) + his Excel. */
function TableDialog({ part, onClose }: any) {
  const xlsx = async () => { const all = (window as any).__qrParts || [part]; const r = await (window as any).qr.exportRequirements(all); if (r && r.path) (window as any).qr.openPath(r.path); };
  return <Modal wide title={t('bd.table')} testid="dlg-bd-table" onClose={onClose}
    footer={<><button className={MRT_BTN} data-testid="btn-export-xlsx" title={t('tip.exportXlsx')} onClick={xlsx}>{t('pp.export')}</button><button className={MRT_BTN_PRIMARY} title={t('tip.close')} onClick={onClose}>{t('bd.close')}</button></>}>
    <table className="qr-table"><thead><tr><th>{t('pp.page')}</th><th>{t('bd.t.section')}</th><th>{t('pp.no')}</th><th>{t('bd.t.text')}</th><th>{t('bd.t.cat')}</th></tr></thead>
      <tbody>{(part.requirements || []).flatMap((p: any) => p.rows.map((r: any, i: number) => <tr key={p.page + '-' + i}><td>{p.page}</td><td className="qr-ltr">{r.section}</td><td className="qr-ltr">{r.no}</td><td><bdi style={{ whiteSpace: 'pre-wrap' }}>{r.text}</bdi></td><td>{r.cat}</td></tr>))}</tbody></table>
  </Modal>;
}

export function Breakdown({ part, parts, sel, setSel, details, onFocus, goStep }: any) {
  const [open, setOpen] = useState<string | null>(null);
  const [table, setTable] = useState(false);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const pages = (part.requirements || []).filter((p: any) => (p.rows || []).length || p.material);
  const flags = (part.problems || []).filter((p: any) => p.severity !== 'Info' && p.status !== 'resolved');
  const n = parts.length, last = sel >= n - 1;
  const show = (sec: any, pg: any) => {
    const k = pg.page + sec.key; setOpen(open === k ? null : k);
    const src = sectionRows(sec, pg).map((r: any) => r.src || '').join(' ');
    const dp = (part.drawing.pages || []).find((x: any) => x.n === pg.page);
    const bbox = locate(src, dp?.tokens || []);
    if (bbox) onFocus({ page: pg.page, bbox, id: 'bd-' + k });
  };
  return <div className="qr-panel" data-testid="breakdown-panel">
    <div className="qr-card-h">
      <span className="qr-pn qr-ltr" data-testid="card-pn">{part.partNo}</span>{part.rev ? <span className="qr-muted"> {t('bd.rev')} {part.rev}</span> : null}
      <span className="qr-muted qr-card-of" data-testid="card-of">{t('bd.of', { i: sel + 1, n })}</span>
    </div>
    <div className="qr-scroll qr-card" data-testid="processes-panel">
      {flags.length > 0 && <div className="qr-card-flags" data-testid="card-flags">{flags.slice(0, 4).map((p: any) => <div key={p.id} data-sev={p.severity}>✕ <bdi>{p.message}</bdi></div>)}{flags.length > 4 && <div className="qr-muted">{t('bd.more', { n: flags.length - 4 })}</div>}</div>}
      {!pages.length && <div className="qr-muted">{t('pp.none')}</div>}
      {pages.map((pg: any) => <div key={pg.page} className="qr-card-page">
        {pages.length > 1 && <div className="qr-lbl">{t('pp.page')} {pg.page}</div>}
        {SECTIONS.map((sec) => { const rows = sectionRows(sec, pg); if (!rows.length && sec.key === 'other') return null;
          const k = pg.page + sec.key; const empty = !rows.length; const line = sectionLine(sec.key, pg, part);
          const fl = sectionFlags(sec, pg); const act = sectionAction(fl, empty && sec.key === 'material'); const stds = sectionStds(sec, pg);
          return <section key={sec.key} className="qr-bsec" data-testid={'bd-' + sec.key} data-empty={empty} data-open={open === k}>
            <div className="qr-sec-line">
              <button type="button" className="qr-sec-main" title={t('tip.bdSection')} data-testid={'bd-open-' + sec.key} onClick={() => !empty && show(sec, pg)}>
                <span className="qr-lbl">{t('bd.s.' + sec.key)}</span>
                <span className="qr-sec-val">{empty ? t('bd.notOn') : <bdi>{line}</bdi>}</span>
                {stds.length > 0 && <span className="qr-ltr qr-muted qr-sec-std">[{stds.slice(0, 2).join('; ')}]</span>}
                {fl.map((f: string) => <Chip key={f} t={FTONE[f]} testid={'flag-' + f}>{t('bd.flag.' + f)}</Chip>)}
              </button>
              {!(empty && sec.key !== 'material') && (act === 'confirm'
                ? <button type="button" className={MRT_BTN} data-active={!!ok[k]} data-testid={'bd-act-' + sec.key} title={t('tip.bd.confirm')} onClick={() => setOk({ ...ok, [k]: !ok[k] })}>{ok[k] ? '✓ ' : ''}{t('bd.a.confirm')}</button>
                : <button type="button" className={MRT_BTN} data-testid={'bd-act-' + sec.key} title={t('tip.bd.' + act)} onClick={() => goStep(3)}>{t('bd.a.' + act)}</button>)}
            </div>
            {open === k && <div className="qr-sec-body"><Fields sec={sec} rows={rows} details={details} /></div>}
          </section>; })}
      </div>)}
      {(part.requirements || []).some((p: any) => p.rows.length) && <button type="button" className={MRT_BTN + ' qr-sec-table'} data-testid="btn-bd-table" title={t('tip.bdTable')} onClick={() => setTable(true)}>{t('bd.table')}</button>}
    </div>
    <div className="qr-card-nav">
      <button type="button" className={MRT_BTN} data-testid="btn-prev-part" disabled={sel === 0} title={t('tip.prevPart')} onClick={() => setSel(sel - 1)}>{t('bd.prev')}</button>
      <button type="button" className={MRT_BTN_PRIMARY} data-testid="btn-next-part" title={last ? t('tip.toDocs') : t('tip.nextPart')} onClick={() => (last ? goStep(3) : setSel(sel + 1))}>{last ? t('bd.toDocs') : t('bd.nextPart')}</button>
    </div>
    {table && <TableDialog part={part} onClose={() => setTable(false)} />}
  </div>;
}
