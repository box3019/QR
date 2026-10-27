// Parts list grouping by plain status. Pure logic, no UI. Order is fixed; empty groups are dropped.
export const GROUP_ORDER = ['ready', 'needsDoc', 'needsAnswer', 'notOurs'];
const open = (p) => p.status !== 'resolved';
/** One plain status per part: not ours > needs document > needs answer > ready. */
export function plainStatus(part) {
  const probs = part.problems || [], tasks = part.tasks || [];
  if (part.status === 'rejected' || probs.some((x) => open(x) && x.internal)) return 'notOurs';
  if (tasks.some((x) => x.type === 'uploadDocument' && x.status !== 'done')) return 'needsDoc';
  if (part.status === 'pending' || probs.some((x) => open(x) && (x.severity === 'Blocker' || x.severity === 'Question'))) return 'needsAnswer';
  return 'ready';
}
/** Returns [{ key, items: [{ part, index }] }] in GROUP_ORDER; index is the part's position in the input. */
export function groupParts(parts, statusOf = plainStatus) {
  const m = new Map(GROUP_ORDER.map((k) => [k, []]));
  (parts || []).forEach((part, index) => { const k = statusOf(part); (m.get(k) || m.get('needsAnswer')).push({ part, index }); });
  return GROUP_ORDER.filter((k) => m.get(k).length).map((k) => ({ key: k, items: m.get(k) }));
}
