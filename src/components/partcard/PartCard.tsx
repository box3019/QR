// Step 2 part card: one guided check at a time. Full checklist, route card and table stay behind buttons.
import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN } from '../../ui/mrtButtons';
import { usePartCard } from '../../hooks/usePartCard';
import { buildBlocks, allGood } from '../../parts/blocks.mjs';
import { cardPages } from '../../parts/breakdown.mjs';
import { firstTaskIndex, guideTasks, initialMarks } from '../../parts/guide.mjs';
import { TableDialog } from './TableDialog';
import { ChecklistSection } from '../../checklist/Checklist';
import { RouteCardSection } from './RouteCardSection';
import { GuidePanel } from './GuidePanel';
import { MoreMenu } from '../MoreMenu';

const api = () => (window as any).qr || {};

export function PartCard({ part, n, sel, setSel, details, onFocus, goStep, focus, onPatch, onPrint, onSave }: any) {
  const card = usePartCard(part, onFocus);
  const [table, setTable] = useState(false);
  const [extra, setExtra] = useState<null | 'checklist' | 'route'>(null);
  const [local, setLocal] = useState<Record<string, any>>({});
  const blocks = useMemo(() => buildBlocks(part), [part]);
  const tasks = useMemo(() => guideTasks(blocks), [blocks]);
  const [marks, setMarks] = useState(() => initialMarks(tasks, part.guideMarks));
  const [cursor, setCursor] = useState(() => firstTaskIndex(tasks, initialMarks(tasks, part.guideMarks)));
  useEffect(() => { const m = initialMarks(guideTasks(buildBlocks(part)), part.guideMarks); setMarks(m); setCursor(firstTaskIndex(guideTasks(buildBlocks(part)), m)); setExtra(null); }, [part.partNo, part.rev, sel]);
  const pages = cardPages(part);
  const persist = (next: any) => { setMarks(next); if (onPatch) onPatch({ ...part, guideMarks: next }); };
  const act = async (b: any, kind: string) => {
    const a = b.action; if (!a && kind !== 'confirm') return;
    if (kind === 'confirm' && b.kind === 'field' && b.sec && b.pg) return card.confirm(b.pg.page + b.sec.key);
    if (kind === 'confirm' && a && a.kind === 'confirm') { await api().stdConfirm?.(a.std, part.customer || ''); return setLocal({ ...local, [b.id]: { confirmed: true } }); }
    if (kind === 'upload' && a && a.std) { const r = await api().stdUpload?.(a.std, part.customer || '', `part:${part.partNo || ''}|${part.rev || ''}`); if (r) setLocal({ ...local, [b.id]: { file: r.file } }); }
  };
  const good = allGood(blocks.map((b: any) => (marks[b.id] === 'done' ? { ...b, status: 'ok' } : b)));
  return <div className="qr-panel" data-testid="breakdown-panel">
    <div className="qr-scroll qr-card" data-testid="processes-panel">
      {good && <div className="qr-allgood" data-testid="all-good"><i className="qr-dot" data-s="ok" aria-hidden="true" />{t('blk.allGood')}</div>}
      <GuidePanel part={part} tasks={tasks} marks={marks} setMarks={persist} cursor={cursor} setCursor={setCursor} extra={extra} setExtra={setExtra} onFocus={onFocus} onAction={act} onPrint={onPrint} onSave={onSave} goStep={goStep} focus={focus} />
      {extra === 'checklist' && <ChecklistSection part={part} onFocus={onFocus} focusId={focus && focus.id} />}
      {extra === 'route' && <RouteCardSection part={part} />}
      <div className="qr-guide-more">
        {extra && <button type="button" className={MRT_BTN} data-testid="guide-back" title={t('gd.hideExtra')} onClick={() => setExtra(null)}>{t('gd.hideExtra')}</button>}
        <MoreMenu testid="guide-more" items={[
          { testid: 'guide-open-ck', label: t('gd.showChecklist'), tip: t('tip.checklist'), onClick: () => setExtra('checklist') },
          { testid: 'guide-open-rc', label: t('gd.showRoute'), tip: t('tip.routeCard'), onClick: () => setExtra('route') },
          pages.some((p: any) => p.rows.length) && { testid: 'btn-bd-table', label: t('gd.showTable'), tip: t('tip.bdTable'), onClick: () => setTable(true) },
          { testid: 'guide-open-docs', label: t('gd.showDocs'), tip: t('pv.tipToDocs'), onClick: () => goStep(3) },
        ]} />
      </div>
    </div>
    {table && <TableDialog part={part} onClose={() => setTable(false)} />}
  </div>;
}
