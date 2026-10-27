// Parts list grouped by status (step 2 and 3).
import React from 'react';
import { t, tReadiness, getLang } from '../i18n';
import { Chip } from '../ui/common';
import { PlainStatusBadge } from '../ui/simple';
import { groupParts } from '../parts/groups.mjs';
import { PartGroup } from '../parts/PartGroup';

const L = (o: any, f: string) => (o ? (getLang() === 'he' && o[f + 'He'] ? o[f + 'He'] : o[f]) : '');
const readinessTone = (r: string) => (/^Ready/.test(r) ? 'ready' : /Blocked/.test(r) ? 'danger' : /n\/a/.test(r) ? 'neutral' : 'attention');

export function PartsPanel({ parts, sel, setSel, unknown, details }: any) {
  return <div className="qr-panel" data-testid="parts-panel">
    <div className="qr-panel-h">{t('parts.title')} <span className="qr-muted">({parts.length})</span></div>
    <div className="qr-scroll qr-groups">
      {groupParts(parts).map((g: any) => <PartGroup key={g.key} k={g.key} n={g.items.length}>{g.items.map(({ part: p, index: i }: any) => {
        const b = p.problems.filter((x: any) => x.severity === 'Blocker' && x.status !== 'resolved').length;
        const q = p.problems.filter((x: any) => x.severity === 'Question' && x.status !== 'resolved').length;
        const tk = p.tasks.filter((x: any) => x.status !== 'done').length;
        return <div key={p.id} className="qr-part" data-active={i === sel} onClick={() => setSel(i)} data-testid="part-item">
          <div className="qr-row"><span className="pn">{p.partNo || p.drawing.name}</span><span className="qr-muted">{t('parts.rev')} <span className="qr-ltr">{p.rev || '-'}</span></span><span style={{ flex: 1 }} />{p.rfq && <span data-testid="part-qty" className="qr-qty">{t('parts.qty')} {p.rfq.qty ?? '?'}{p.rfq.uom && p.rfq.uom !== 'EA' ? ' ' + p.rfq.uom : ''}</span>}</div>
          <div className="qr-row qr-part-sub"><PlainStatusBadge part={p} /><span>{L(p.material, 'normalized') || t('parts.noMaterial')}</span></div>
          {p.status !== 'accepted' && p.rejectReason && <div className="qr-reject">{L(p, 'rejectReason')}</div>}
          {details && <div className="qr-row qr-part-sub">
            <Chip t="neutral">{p.customer}</Chip><Chip t={readinessTone(p.readiness)}>{tReadiness(p.readiness)}</Chip>
            {b > 0 && <Chip t="danger">{t('parts.blockers', { n: b })}</Chip>}{q > 0 && <Chip t="attention">{t('parts.questions', { n: q })}</Chip>}{tk > 0 && <Chip t="info">{t('parts.tasks', { n: tk })}</Chip>}
            <Chip t={p.textMode === 'Text' ? 'neutral' : 'info'}>{p.textMode === 'Text' ? t('parts.textPdf') : p.textMode === 'OCR' ? t('parts.ocr') : t('parts.textOcr')}</Chip>
          </div>}
        </div>;
      })}</PartGroup>)}
      {details && unknown.length > 0 && <div className="qr-part qr-muted">{t('parts.other', { list: unknown.join(', ') })}</div>}
    </div>
  </div>;
}
