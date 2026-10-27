// Progress toast logic: pipeline events -> busy state -> plain localized message key + bar fraction.
/** Start state of a run. */
export const startBusy = () => ({ text: '', stage: null, i: 0, n: 0, progress: null, log: [] });
/** One pipeline event -> next busy state (null stays null). msg(key, vars) localizes log lines. */
export function reduceBusy(b, ev, msg = (k) => k) {
  if (!b) return b;
  if (ev.type === 'status') return { ...b, text: ev.text, stage: ev.stage || b.stage, i: ev.i ?? b.i, n: ev.n ?? b.n, progress: null, log: [...b.log, ev.text].slice(-200) };
  if (ev.type === 'progress') return { ...b, progress: ev.value };
  if (ev.type === 'error') return { ...b, log: [...b.log, msg('busy.error', { text: String(ev.text).split('\n')[0] })] };
  if (ev.type === 'part') return { ...b, log: [...b.log, msg('busy.analyzed', { pn: ev.part.partNo })] };
  return b;
}
/** What the toast shows: a message key + vars, a 0..1 fraction (or null) and the technical line (Details only). */
export function progressView(b) {
  const plain = b.stage && b.n;
  const frac = b.progress != null ? b.progress : plain ? Math.max(0, Math.min(1, (b.i - 1) / b.n)) : null;
  return { key: plain ? 'busy.' + b.stage : 'busy.starting', vars: { i: b.i, n: b.n }, frac, tech: b.text || '' };
}
