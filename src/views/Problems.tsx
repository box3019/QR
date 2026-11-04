// Step 3: documents to upload + questions for the customer, boxed. References/info on demand.
import React, { useState } from 'react';
import { t, getLang } from '../i18n';
import { Chip } from '../ui/common';
import { MRT_ACTION_BTN, MRT_BTN } from '../ui/mrtButtons';
import { Box } from '../components/wizard/Box';
import { MrtTable, MrtHead, MrtGroup, MrtEmpty, MrtRow, OverflowLine } from '../ui/MrtTable';

import { localized as L } from '../i18n/localized';
const tone = (sev: string) => (sev === 'Blocker' ? 'danger' : sev === 'Question' ? 'attention' : 'info');
const qr = () => (window as any).qr;

function ProblemRow({ p, onFocus, updatePart }: any) {
  const toggle = (e: any) => { e.stopPropagation(); updatePart((pt: any) => { const x = pt.problems.find((y: any) => y.id === p.id); x.status = x.status === 'resolved' ? 'open' : 'resolved'; return pt; }); };
  const msg = L(p, 'message');
  const sug = L(p, 'suggestion');
  const full = msg + (sug ? (getLang() === 'he' ? ' ← ' : ' → ') + sug : '');
  const st = p.status === 'resolved' ? 'yes' : (p.severity === 'Blocker' ? 'no' : 'notfound');
  return <MrtRow className="qr-prob" data-testid="problem" data-s={st} active={false} title={p.loc ? t('wz.tipShowOnDrawing') : undefined} onClick={() => p.loc && onFocus({ ...p.loc, id: p.id, bbox: null })} style={p.status === 'resolved' ? { opacity: .5 } : {}}>
    <td><Chip t={tone(p.severity)}>{t('sev.' + p.severity)}</Chip></td>
    <td><span className="qr-ck-s" data-s={st}>{st === 'yes' ? '\u2713' : st === 'no' ? '\u2013' : '?'} {p.status === 'resolved' ? t('pr.resolve') : t('ck.' + (st === 'no' ? 'no' : 'notfound'))}</span></td>
    <td><OverflowLine className="qr-ck-body" text={full}><bdi>{full}</bdi></OverflowLine></td>
    <td className="qr-muted">{p.loc ? t('pr.sheet', { n: p.loc.page }) : ''}</td>
    <td>{p.severity !== 'Info' && <button className={MRT_ACTION_BTN} title={p.status === 'resolved' ? t('pr.reopen') : t('pr.resolve')} onClick={toggle}>{p.status === 'resolved' ? '\u21BA' : '\u2713'}</button>}</td>
  </MrtRow>;
}

export function ProblemsPanel({ part, onFocus, updatePart, details }: any) {
  const [more, setMore] = useState(false);
  const order: any = { Blocker: 0, Question: 1, Info: 2 };
  const sorted = [...part.problems].sort((a, b) => order[a.severity] - order[b.severity]);
  const main = sorted.filter((p: any) => p.severity !== 'Info');
  const info = sorted.filter((p: any) => p.severity === 'Info');
  const uploads = part.tasks.filter((x: any) => x.type === 'uploadDocument' && x.stage !== 'routecard');
  const verify = part.tasks.filter((x: any) => x.type === 'verify');
  const attach = async (tk: any) => {
    let f: string[] = []; let doc: any = null;
    if (tk.status !== 'done' && tk.std) { doc = await qr().stdUpload({ std: tk.refNumber, paid: tk.paid }, tk.customer || '', `part:${part.partNo || ''}|${part.rev || ''}`); f = doc ? [doc.file] : []; }
    else if (tk.status !== 'done') f = await qr().pickFiles();
    updatePart((pt: any) => { const x = pt.tasks.find((y: any) => y.id === tk.id); if (x.status === 'done') { x.status = 'open'; x.file = ''; } else if (f.length) { x.status = 'done'; x.file = f[0]; if (doc) for (const s of pt.standards || []) if (s.std === tk.refNumber) { s.status = s.dims ? 'needsConfirm' : 'resolved'; s.doc = { key: doc.key, rev: doc.rev, sha256: doc.sha256, file: doc.file, scope: doc.scope }; } } return pt; });
  };
  const COLS = 5;
  return <div className="qr-panel" data-testid="problems-panel">
    <div className="qr-panel-h">{t('gd.docsNow')}</div>
    <div className="qr-scroll qr-boxes">
      <Box title={t('wz.secUploads') + ' (' + uploads.filter((x: any) => x.status !== 'done').length + ')'} testid="box-uploads">
        <MrtTable shell className="qr-prob-tab">
          <MrtHead cells={[t('ck.col.item'), t('ck.col.status'), t('ck.col.value'), t('ck.col.source'), '']} />
          <tbody>
            {!uploads.length && <MrtEmpty colSpan={COLS}>{t('wz.noUploads')}</MrtEmpty>}
            {uploads.map((tk: any) => {
              const title = L(tk, 'title').replace(/^\S+ \S+ /, '');
              const val = title + ' · ' + t('pr.blocks', { n: L(tk, 'blocks') });
              const st = tk.status === 'done' ? 'yes' : 'notfound';
              return <MrtRow key={tk.id} className="qr-prob" data-testid="task" data-s={st}>
                <td><span className="pn">{tk.refNumber}</span></td>
                <td><span className="qr-ck-s" data-s={st}>{st === 'yes' ? '\u2713' : '?'} {tk.status === 'done' ? t('pr.uploaded') : t('pr.upload')}</span></td>
                <td><OverflowLine className="qr-ck-body" text={val}>{val}</OverflowLine></td>
                <td className="qr-muted">{tk.file || ''}</td>
                <td><button className={MRT_ACTION_BTN} title={t('tip.attach')} onClick={() => attach(tk)}>{tk.status === 'done' ? t('pr.undo') : t('pr.attach')}</button></td>
              </MrtRow>;
            })}
          </tbody>
        </MrtTable>
      </Box>
      <Box title={t('wz.secQuestions') + ' (' + main.filter((p: any) => p.status !== 'resolved').length + ')'} testid="box-questions">
        <MrtTable shell className="qr-prob-tab">
          <MrtHead cells={[t('ck.col.item'), t('ck.col.status'), t('ck.col.value'), t('ck.col.source'), '']} />
          <tbody>
            {!main.length && <MrtEmpty colSpan={COLS} testid="no-problems">{t('pr.none')}</MrtEmpty>}
            {main.map((p: any) => <ProblemRow key={p.id} p={p} onFocus={onFocus} updatePart={updatePart} />)}
          </tbody>
        </MrtTable>
      </Box>
      <div className="qr-more"><button className={MRT_BTN} data-testid="btn-refs" aria-expanded={more} title={t('wz.tipRefs')} onClick={() => setMore(!more)}>{more ? t('wz.hideRefs') : t('wz.showRefs')}</button></div>
      {more && <Box title={t('pr.refs')} testid="box-refs">
        <MrtTable shell className="qr-prob-tab">
          <MrtHead cells={[t('ck.col.item'), t('ck.col.status'), t('ck.col.value'), t('ck.col.source'), '']} />
          <tbody>
            <MrtGroup colSpan={COLS}>{t('pr.refs')}</MrtGroup>
            {part.refs.map((r: any, i: number) => <MrtRow key={i} className="qr-prob">
              <td><span className="pn">{r.number}</span></td>
              <td><Chip t={r.kind === 'public' ? 'neutral' : r.kind === 'vendor' ? 'info' : 'attention'}>{t('ref.' + r.kind)}</Chip></td>
              <td><OverflowLine className="qr-ck-body" text={(L(r, 'description') || '') + (r.owner ? ' · ' + L(r, 'owner') : '')}>{(L(r, 'description') || '') + (r.owner ? ' · ' + L(r, 'owner') : '')}</OverflowLine></td>
              <td /><td />
            </MrtRow>)}
            {info.length > 0 && <MrtGroup colSpan={COLS} testid="info-group">{t('pr.info', { n: info.length })}</MrtGroup>}
            {info.map((p: any) => <ProblemRow key={p.id} p={p} onFocus={onFocus} updatePart={updatePart} />)}
            {details && verify.length > 0 && <MrtGroup colSpan={COLS}>{t('pr.verify', { n: verify.length })}</MrtGroup>}
            {details && verify.map((tk: any) => <MrtRow key={tk.id} className="qr-prob" onClick={() => onFocus({ page: tk.page, bbox: tk.bbox, id: tk.id })}>
              <td colSpan={COLS}><OverflowLine className="qr-ck-body" text={L(tk, 'title')}>{L(tk, 'title')}</OverflowLine></td>
            </MrtRow>)}
          </tbody>
        </MrtTable>
      </Box>}
    </div>
  </div>;
}
