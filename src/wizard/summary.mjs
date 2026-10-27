// Step 4 numbers: open questions per part, parts with open blocking/warning flags.
export const openQuestions = (p) => p.problems.filter((x) => (x.severity === 'Blocker' || x.severity === 'Question') && x.status !== 'resolved').length;
export function summaryCounts(parts) {
  const nq = parts.reduce((s, p) => s + openQuestions(p), 0);
  const np = parts.filter((p) => openQuestions(p) > 0).length;
  const flagged = parts.map((p, i) => i).filter((i) => parts[i].problems.some((x) => (x.severity === 'Blocker' || x.severity === 'Warning') && x.status !== 'resolved'));
  return { nq, np, flagged };
}
