// Step 4 numbers: open questions per part, and the parts that are NOT ready. One source: plainStatus (the same one the tiles use).
import { plainStatus } from '../parts/groups.mjs';
export const openQuestions = (p) => p.problems.filter((x) => (x.severity === 'Blocker' || x.severity === 'Question') && x.status !== 'resolved').length;
export function summaryCounts(parts) {
  const nq = parts.reduce((s, p) => s + openQuestions(p), 0);
  const np = parts.filter((p) => openQuestions(p) > 0).length;
  const flagged = parts.map((p, i) => i).filter((i) => plainStatus(parts[i]) !== 'ready');
  return { nq, np, flagged };
}
