// Progress toast logic: pipeline events -> busy state -> plain localized message key + bar fraction.
/** Start state of a run. */
export const startBusy = () => ({ text: '', stage: null, i: 0, n: 0, progress: null, log: [], finished: false, partsI: 0, partsN: null });
/** One pipeline event -> next busy state (null stays null). msg(key, vars) localizes log lines. */
export function reduceBusy(b, ev, msg = (k) => k) {
  if (!b) return b;
  if (ev.type === 'done') return { ...b, finished: true, stage: 'parts', i: b.partsN != null ? b.partsN : (ev.n ?? b.i), n: b.partsN != null ? b.partsN : (ev.n ?? b.n), partsI: b.partsN != null ? b.partsN : (ev.n ?? b.partsI), progress: null };
  if (ev.type === 'status') {
    const parts = ev.stage === 'parts';
    return { ...b, text: ev.text, stage: ev.stage || b.stage, i: ev.i ?? b.i, n: ev.n ?? b.n, partsI: parts ? (ev.i ?? 0) : b.partsI, partsN: parts ? (ev.n ?? 0) : b.partsN, progress: null, log: [...b.log, ev.text].slice(-200) };
  }
  if (ev.type === 'progress') return { ...b, progress: ev.value };
  if (ev.type === 'error') return { ...b, log: [...b.log, msg('busy.error', { text: String(ev.text).split('\n')[0] })] };
  if (ev.type === 'part') return { ...b, log: [...b.log, msg('busy.analyzed', { pn: ev.part.partNo })] };
  return b;
}
/** True when every expected part has been analysed (or there were none). */
export function busyComplete(b) {
  if (!b) return true;
  if (b.finished) return true;
  if (b.partsN != null && Number(b.partsN) > 0 && Number(b.partsI) >= Number(b.partsN)) return true;
  return false;
}
/** Clear busy only after analysis of every part; otherwise keep the indicator on. */
export function stopBusy(b) {
  return busyComplete(b) ? null : b;
}
/** What the toast shows: a message key + vars, a 0..1 fraction (or null) and the technical line (Details only). */
export function progressView(b) {
  if (b.partsN != null) {
    const i = b.partsI || 0, n = b.partsN || 0;
    const frac = n ? Math.max(0, Math.min(1, i / n)) : (b.finished ? 1 : null);
    return { key: 'busy.parts', vars: { i, n }, frac, tech: b.text || '', done: n > 0 ? i >= n : !!b.finished };
  }
  const plain = b.stage && b.n;
  const frac = b.progress != null ? b.progress : plain ? Math.max(0, Math.min(1, (b.i - 1) / b.n)) : null;
  return { key: plain ? 'busy.' + b.stage : 'busy.starting', vars: { i: b.i, n: b.n }, frac, tech: b.text || '', done: false };
}
