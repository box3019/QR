// The "next step" line under the step title and the reasons shown on disabled buttons. Pure logic.
import { plainStatus } from '../parts/groups.mjs';
const name = (p) => (p && (p.partNo || (p.drawing && p.drawing.name))) || '';
/** { key, vars, dot, go } for t(key): names the concrete next item. go = { step?, part?, action?: 'files' | 'export' }. null while a run is working. */
export function nextAction(step, parts, busy) {
  if (busy) return null;
  if (!parts || !parts.length) return { key: 'ns.load', vars: {}, dot: 'none', go: { step: 1, action: 'files' } };
  const st = parts.map(plainStatus);
  if (step === 1) { const i = Math.max(0, st.findIndex((s) => s !== 'ready' && s !== 'notOurs')); return { key: parts.length === 1 ? 'ns.check1' : 'ns.check', vars: { n: parts.length, part: name(parts[i]) }, dot: 'none', go: { step: 2, part: i } }; }
  for (const k of ['needsDoc', 'needsAnswer']) { const idx = []; st.forEach((s, i) => { if (s === k) idx.push(i); });
    if (idx.length) return { key: 'ns.' + k + (idx.length === 1 ? '1' : ''), vars: { n: idx.length, part: name(parts[idx[0]]) }, dot: 'warn', go: { step: 3, part: idx[0] } }; }
  return step < 4 ? { key: 'ns.done', vars: {}, dot: 'ok', go: { step: 4 } } : { key: 'ns.export', vars: {}, dot: 'ok', go: { action: 'export' } };
}
/** Why a button is disabled (i18n key) or null when it is enabled. */
export const nextWhy = (step, hasParts) => (!hasParts ? 'dis.noParts' : step >= 4 ? 'dis.lastStep' : null);
export const cancelWhy = (hasParts) => (hasParts ? null : 'dis.nothingToClear');
export const stepWhy = (n, hasParts) => (n === 1 || hasParts ? null : 'dis.stepLocked');
export const saveWhy = (nParts, busy) => (!nParts ? 'dis.nothingToSave' : busy ? 'dis.busySave' : null);
