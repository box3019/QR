// Parts list grouping by plain status. Pure logic, no UI. Order is fixed; empty groups are dropped.
export const GROUP_ORDER = ['ready', 'needsDoc', 'needsAnswer', 'notOurs'];
const open = (p) => p.status !== 'resolved';
/** An upload task that can make a part 'needs document': open, and needed NOW to evaluate. Route-card documents (stage 'routecard': customer specs, certificates) never count. */
export const isOpenDoc = (x) => !!x && x.type === 'uploadDocument' && x.status !== 'done' && x.stage !== 'routecard';
/** One plain status per part: not ours > needs document > needs answer > ready. */
export function plainStatus(part) {
  const probs = part.problems || [], tasks = part.tasks || [];
  if (part.status === 'rejected' || probs.some((x) => open(x) && x.internal)) return 'notOurs';
  if (tasks.some(isOpenDoc)) return 'needsDoc';
  if (part.status === 'pending' || probs.some((x) => open(x) && (x.severity === 'Blocker' || x.severity === 'Question'))) return 'needsAnswer';
  return 'ready';
}
/** Returns [{ key, items: [{ part, index }] }] in GROUP_ORDER; index is the part's position in the input. */
export function groupParts(parts, statusOf = plainStatus) {
  const m = new Map(GROUP_ORDER.map((k) => [k, []]));
  (parts || []).forEach((part, index) => { const k = statusOf(part); (m.get(k) || m.get('needsAnswer')).push({ part, index }); });
  return GROUP_ORDER.filter((k) => m.get(k).length).map((k) => ({ key: k, items: m.get(k) }));
}
/** Counts per group, always all four keys (tiles show zeros too). */
export function tileCounts(parts, statusOf = plainStatus) {
  const c = Object.fromEntries(GROUP_ORDER.map((k) => [k, 0]));
  for (const p of parts || []) c[statusOf(p) in c ? statusOf(p) : 'needsAnswer']++;
  return c;
}
/** Group list narrowed to one key (null = all). */
export const filterGroups = (groups, key) => (key ? groups.filter((g) => g.key === key) : groups);
/** Status key -> semantic dot colour key used by every status dot. */
export const DOT = { ready: 'ok', needsDoc: 'warn', needsAnswer: 'warn', notOurs: 'bad' };
