// MRT left-rail numbers: job/part label, critical-item count, first drawing for the thumbnail.
import { tightItems, thresholds } from '../../core/checklist/live.mjs';
import { tabMeta } from '../projects/store.mjs';

/** Large rail title: RFQ / subject / first part number (same as the job tab). */
export function jobLabel({ rfqs = [], parts = [] } = {}) {
  return tabMeta({ rfqs, parts }).label || '';
}

/** Tight / critical dimensions on loaded parts (MRT Critical Dimensions count). */
export function criticalCount(parts = [], settings) {
  const th = thresholds(settings);
  return (parts || []).reduce((n, p) => n + tightItems(p && p.checklist, th).length, 0);
}

/** Drawing used for the rail thumbnail: selected part, else the first part that has a sheet. */
export function drawingOf(parts = [], sel = 0) {
  const list = parts || [];
  const cur = list[sel];
  if (cur && cur.drawing && cur.drawing.path) return cur.drawing;
  return list.find((p) => p && p.drawing && p.drawing.path)?.drawing || null;
}
