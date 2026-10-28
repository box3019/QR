// Step 2 part card: header (part no, rev, "part i of n"), flags on top, the friend's sections, Show table, Previous/Next.
import React, { useMemo, useState } from 'react';
import { t } from '../../i18n';
import { MRT_BTN, MRT_BTN_PRIMARY } from '../../ui/mrtButtons';
import { usePartCard } from '../../hooks/usePartCard';
import { buildBlocks, allGood } from '../../parts/blocks.mjs';
import { cardPages } from '../../parts/breakdown.mjs';
import { TableDialog } from './TableDialog';
import { BlockCard } from './BlockCard';
import { RouteCardSection } from './RouteCardSection';
import { ChecklistSection } from '../../checklist/Checklist';

const api = () => (window as any).qr || {};

export function PartCard({ part, n, sel, setSel, details, onFocus, goStep }: any) {
  const card = usePartCard(part, onFocus);
  const [table, setTable] = useState(false);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [local, setLocal] = useState<Record<string, any>>({});
  const blocks = useMemo(() => buildBlocks(part), [part]);
  const pages = cardPages(part); const last = sel >= n - 1;
  const fkey = (b: any) => b.pg.page + b.sec.key;
  const toggle = (b: any) => { setOpenIds({ ...openIds, [b.id]: !openIds[b.id] }); if (b.kind === 'field' && b.sec && !openIds[b.id]) card.toggle(b.sec, b.pg); };
  const owner = `part:${part.partNo || ''}|${part.rev || ''}`;
  const act = async (b: any) => {
    const a = b.action; if (!a) return;
    if (a.kind === 'confirm' && b.kind === 'field') return card.confirm(fkey(b));
    if (a.kind === 'confirm') { await api().stdConfirm?.(a.std, part.customer || ''); return setLocal({ ...local, [b.id]: { confirmed: true } }); }
    if (a.kind === 'upload' && a.std) { const r = await api().stdUpload?.(a.std, part.customer || '', owner); if (r) setLocal({ ...local, [b.id]: { file: r.file } }); return; }
    goStep(3);
  };
  const stateOf = (b: any) => (b.kind === 'field' && b.sec ? { ok: !!card.ok[fkey(b)] } : local[b.id]);
  const good = allGood(blocks.map((b: any) => (local[b.id] ? { ...b, status: 'ok' } : b)));
  return <div className="qr-panel" data-testid="breakdown-panel">
    <div className="qr-scroll qr-card" data-testid="processes-panel">
      {good && <div className="qr-allgood" data-testid="all-good"><i className="qr-dot" data-s="ok" aria-hidden="true" />{t('blk.allGood')}</div>}
      <div className="qr-blocks" data-testid="blocks">
        {blocks.map((b: any) => <BlockCard key={b.id} block={b} part={part} open={!!openIds[b.id]} onToggle={() => toggle(b)} onAction={act} state={stateOf(b)} />)}
      </div>
      <ChecklistSection part={part} onFocus={onFocus} />
      <RouteCardSection part={part} />
      {pages.some((p: any) => p.rows.length) && <button type="button" className={MRT_BTN + ' qr-sec-table'} data-testid="btn-bd-table" title={t('tip.bdTable')} onClick={() => setTable(true)}>{t('bd.table')}</button>}
    </div>
    {table && <TableDialog part={part} onClose={() => setTable(false)} />}
  </div>;
}
