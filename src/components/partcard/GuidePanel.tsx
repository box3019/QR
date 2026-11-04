// One check at a time: stepper, the current task, Confirm / Mark problem, then a part summary.
import React, { useEffect, useMemo } from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY, MRT_ACTION_BTN_DANGER } from '../../ui/mrtButtons';
import { BlockCard, lineText } from './BlockCard';
import { applyMark, locateBlock, MARK_DONE, MARK_PROBLEM, missingDocs, nextTaskIndex, openQuestions, taskState } from '../../parts/guide.mjs';
import { MrtTable, MrtHead, MrtRow } from '../../ui/MrtTable';
import { localized } from '../../i18n/localized';

export function GuidePanel({ part, tasks, marks, setMarks, cursor, setCursor, extra, setExtra, onFocus, onAction, onPrint, onSave, goStep, focus }: any) {
  const n = tasks.length; const onSum = cursor >= n; const task = !onSum && tasks[cursor];
  const title = task ? (task.kind === 'standard' ? String(task.title || '') : t(task.titleKey)) : t('gd.summary');
  useEffect(() => { if (!task || extra) return; const loc = locateBlock(part, task); if (loc) onFocus(loc); }, [task && task.id, extra]);
  const mark = (kind: string) => {
    if (!task) return;
    setMarks(applyMark(marks, task.id, kind));
    if (kind === MARK_DONE) onAction(task, 'confirm');
    setCursor(nextTaskIndex(tasks, applyMark(marks, task.id, kind), cursor));
  };
  const docs = useMemo(() => missingDocs(part), [part]); const qs = useMemo(() => openQuestions(part), [part]);
  const marked = tasks.filter((b: any) => taskState(b, marks) === MARK_PROBLEM);
  return <div className="qr-guide" data-testid="guide-panel">
    <div className="qr-guide-head">
      <div className="qr-guide-of" data-testid="guide-of">{t('gd.of', { n: onSum ? n : cursor + 1, m: n })}</div>
      <div className="qr-gsteps" data-testid="guide-steps" role="tablist">
        {tasks.map((b: any, i: number) => <button type="button" key={b.id} className="qr-gstep" data-testid="guide-step" data-s={taskState(b, marks)} data-current={i === cursor ? '1' : undefined} title={t('tip.gdStep')} onClick={() => { setExtra(null); setCursor(i); }}>{i + 1}</button>)}
        <button type="button" className="qr-gstep qr-gstep-sum" data-testid="guide-sum-step" data-s={marked.length ? MARK_PROBLEM : (tasks.every((b: any) => taskState(b, marks) === MARK_DONE) ? MARK_DONE : 'todo')} data-current={onSum ? '1' : undefined} title={t('gd.summary')} onClick={() => { setExtra(null); setCursor(n); }}>{t('wz.s4')}</button>
      </div>
    </div>
    <h3 className="qr-guide-title" data-testid="guide-title">{task && task.kind !== 'standard' ? t('gd.check', { what: title }) : title}</h3>
    {!extra && task && <div className="qr-guide-task" data-testid="guide-task">
      <BlockCard block={task} part={part} open onToggle={() => {}} onAction={(b: any) => onAction(b, b.action && b.action.kind)} state={task.kind === 'field' ? { ok: taskState(task, marks) === MARK_DONE } : (taskState(task, marks) === MARK_DONE ? { confirmed: true } : null)} onFocus={onFocus} hideAction />
      <p className="qr-guide-line" data-testid="guide-line">{lineText(task, null, part)}</p>
      <div className="qr-guide-acts">
        <button type="button" className={MRT_BTN_PRIMARY + ' qr-guide-btn'} data-testid="guide-confirm" title={t('tip.gdConfirm')} onClick={() => mark(MARK_DONE)}>{t('gd.confirm')}</button>
        <button type="button" className={MRT_ACTION_BTN_DANGER + ' qr-guide-btn'} data-testid="guide-problem" title={t('tip.gdProblem')} onClick={() => mark(MARK_PROBLEM)}>{t('gd.problem')}</button>
      </div>
    </div>}
    {!extra && onSum && <div className="qr-guide-sum" data-testid="guide-summary">
      <h4 className="qr-guide-sec">{t('gd.missingDocs')}</h4>
      {docs.length ? <MrtTable className="qr-bd-tab" testid="guide-docs"><MrtHead cells={[t('ck.col.item'), t('ck.col.status')]} /><tbody>{docs.map((d: any) => <MrtRow key={d.id} className="qr-bd-item"><td><bdi className="qr-ltr">{d.refNumber || d.title}</bdi></td><td>{t('pr.upload')}</td></MrtRow>)}</tbody></MrtTable> : <p className="qr-muted">{t('gd.noMissing')}</p>}
      <h4 className="qr-guide-sec">{t('gd.questions')}</h4>
      {qs.length || marked.length ? <MrtTable className="qr-bd-tab" testid="guide-qs"><MrtHead cells={[t('ck.col.item'), t('ck.col.value')]} /><tbody>
        {qs.map((p: any) => <MrtRow key={p.id} className="qr-bd-item"><td>{t('sev.' + p.severity)}</td><td><bdi>{localized(p, 'message')}</bdi></td></MrtRow>)}
        {marked.map((b: any) => <MrtRow key={b.id} className="qr-bd-item"><td>{t('gd.marked')}</td><td>{b.kind === 'standard' ? <bdi className="qr-ltr">{b.title}</bdi> : t(b.titleKey)}</td></MrtRow>)}
      </tbody></MrtTable> : <p className="qr-muted">{t('gd.noQuestions')}</p>}
      <div className="qr-guide-acts">
        <button type="button" className={MRT_BTN} data-testid="guide-print" title={t('tip.printPart')} onClick={onPrint}>{t('top.print')}</button>
        <button type="button" className={MRT_BTN_PRIMARY} data-testid="guide-pdf" title={t('tip.savePdfPart')} onClick={onSave}>{t('top.savePdf')}</button>
        <button type="button" className={MRT_BTN} data-testid="guide-to-docs" title={t('pv.tipToDocs')} onClick={() => goStep(3)}>{t('pv.toDocs')}</button>
      </div>
    </div>}
  </div>;
}
