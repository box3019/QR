// Step 3: documents to upload + questions for the customer, boxed. References/info on demand.
import React, { useState } from 'react';
import { t, getLang } from '../i18n';
import { Chip } from '../ui/common';
import { MRT_ACTION_BTN, MRT_BTN } from '../ui/mrtButtons';
import { Box } from '../components/wizard/Box';

const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
const tone = (sev: string) => (sev === 'Blocker' ? 'danger' : sev === 'Question' ? 'attention' : 'info');
const qr = () => (window as any).qr;

function ProblemLine({ p, onFocus, updatePart }: any) {
  const toggle = (e: any) => { e.stopPropagation(); updatePart((pt: any) => { const x = pt.problems.find((y: any) => y.id === p.id); x.status = x.status === 'resolved' ? 'open' : 'resolved'; return pt; }); };
  return <div className="qr-prob" data-testid="problem" title={p.loc ? t('wz.tipShowOnDrawing') : undefined} onClick={() => p.loc && onFocus({ ...p.loc, id: p.id, bbox: null })} style={p.status === 'resolved' ? { opacity: .5 } : {}}>
    <div className="qr-row"><Chip t={tone(p.severity)}>{t('sev.' + p.severity)}</Chip><span className="qr-cat">{L(p, 'category')}</span>{p.loc && <span className="qr-muted">{t('pr.sheet', { n: p.loc.page })}</span>}<span style={{ flex: 1 }} />
      {p.severity !== 'Info' && <button className={MRT_ACTION_BTN} title={p.status === 'resolved' ? t('pr.reopen') : t('pr.resolve')} onClick={toggle}>{p.status === 'resolved' ? '↺' : '✓'}</button>}</div>
    <div className="msg"><bdi>{L(p, 'message')}</bdi>{L(p, 'suggestion') && <span className="qr-muted"> → {L(p, 'suggestion')}</span>}</div>
  </div>;
}

export function ProblemsPanel({ part, onFocus, updatePart, details }: any) {
  const [more, setMore] = useState(false);
  const order: any = { Blocker: 0, Question: 1, Info: 2 };
  const sorted = [...part.problems].sort((a, b) => order[a.severity] - order[b.severity]);
  const main = sorted.filter((p: any) => p.severity !== 'Info');
  const info = sorted.filter((p: any) => p.severity === 'Info');
  const uploads = part.tasks.filter((x: any) => x.type === 'uploadDocument');
  const verify = part.tasks.filter((x: any) => x.type === 'verify');
  const attach = async (tk: any) => { const f = tk.status === 'done' ? [] : await qr().pickFiles(); updatePart((pt: any) => { const x = pt.tasks.find((y: any) => y.id === tk.id); if (x.status === 'done') { x.status = 'open'; x.file = ''; } else if (f.length) { x.status = 'done'; x.file = f[0]; } return pt; }); };
  return <div className="qr-panel" data-testid="problems-panel">
    <div className="qr-panel-h"><span className="pn">{part.partNo || part.drawing.name}</span></div>
    <div className="qr-scroll qr-boxes">
      <Box title={t('wz.secUploads') + ' (' + uploads.filter((x: any) => x.status !== 'done').length + ')'} testid="box-uploads">
        {!uploads.length && <div className="qr-muted">{t('wz.noUploads')}</div>}
        {uploads.map((tk: any) => <div key={tk.id} className="qr-prob" data-testid="task" style={{ cursor: 'default' }}>
          <div className="qr-row"><Chip t={tk.status === 'done' ? 'ready' : 'info'}>{tk.status === 'done' ? t('pr.uploaded') : t('pr.upload')}</Chip><span className="pn">{tk.refNumber}</span></div>
          <div className="msg">{L(tk, 'title').replace(/^\S+ \S+ /, '')} · {t('pr.blocks', { n: L(tk, 'blocks') })}</div>
          <div className="qr-row"><button className={MRT_ACTION_BTN} title={t('tip.attach')} onClick={() => attach(tk)}>{tk.status === 'done' ? t('pr.undo') : t('pr.attach')}</button>{tk.file && <span className="qr-muted">{tk.file}</span>}</div>
        </div>)}
      </Box>
      <Box title={t('wz.secQuestions') + ' (' + main.filter((p: any) => p.status !== 'resolved').length + ')'} testid="box-questions">
        {!main.length && <div className="qr-muted" data-testid="no-problems">{t('pr.none')}</div>}
        {main.map((p: any) => <ProblemLine key={p.id} p={p} onFocus={onFocus} updatePart={updatePart} />)}
      </Box>
      <div className="qr-more"><button className={MRT_BTN} data-testid="btn-refs" aria-expanded={more} title={t('wz.tipRefs')} onClick={() => setMore(!more)}>{more ? t('wz.hideRefs') : t('wz.showRefs')}</button></div>
      {more && <Box title={t('pr.refs')} testid="box-refs">
        {part.refs.map((r: any, i: number) => <div key={i} className="qr-prob" style={{ cursor: 'default' }}><div className="qr-row"><Chip t={r.kind === 'public' ? 'neutral' : r.kind === 'vendor' ? 'info' : 'attention'}>{t('ref.' + r.kind)}</Chip><span className="pn">{r.number}</span></div><div className="msg qr-muted">{L(r, 'description')}{r.owner ? ' · ' + L(r, 'owner') : ''}</div></div>)}
        {info.length > 0 && <details className="qr-info-group" data-testid="info-group"><summary>{t('pr.info', { n: info.length })}</summary>{info.map((p: any) => <ProblemLine key={p.id} p={p} onFocus={onFocus} updatePart={updatePart} />)}</details>}
        {details && verify.length > 0 && <details className="qr-info-group"><summary>{t('pr.verify', { n: verify.length })}</summary>
          {verify.map((tk: any) => <div key={tk.id} className="qr-prob" onClick={() => onFocus({ page: tk.page, bbox: tk.bbox, id: tk.id })}><div className="msg">{L(tk, 'title')}</div></div>)}</details>}
      </Box>}
    </div>
  </div>;
}
