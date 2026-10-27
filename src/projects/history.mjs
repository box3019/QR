// History list logic (pure): entry from a project's tab meta and parts, search filter, last-N for Step 1.
import { groupParts } from '../parts/groups.mjs';
/** One history entry: label (RFQ no. or subject), customer, part count, groups summary, step, part numbers, opened time. */
export function historyEntry(id, meta, parts, opened) {
  const groups = Object.fromEntries(groupParts(parts || []).map((g) => [g.key, g.items.length]));
  return { id, label: meta.label || '', key: meta.key || null, customer: meta.customer || '', nParts: (parts || []).length, groups, step: meta.step || 1, partNos: (parts || []).map((p) => p.partNo).filter(Boolean).slice(0, 200), opened };
}
const norm = (s) => String(s || '').toLowerCase();
/** Filter by RFQ (label/key), part number or customer; empty query = all. */
export function filterHistory(list, q) {
  const k = norm(q).trim(); if (!k) return list;
  return list.filter((e) => [e.label, e.key, e.customer, ...(e.partNos || [])].some((v) => norm(v).includes(k)));
}
/** Only entries worth showing (something was loaded). */
export const recent = (list, n = 5) => list.filter((e) => e.nParts > 0).slice(0, n);
/** Should the history be updated: the project has parts and something shown changed. */
export function changed(a, b) { if (!b || !b.nParts) return false; if (!a) return true; return ['label', 'customer', 'nParts', 'step'].some((k) => a[k] !== b[k]) || JSON.stringify(a.groups) !== JSON.stringify(b.groups); }
