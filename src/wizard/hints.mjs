// Assistant hint per step and context: step + state -> i18n key and vars. Pure logic.
/** One short hint (max 2 lines) for the current step; null when there is nothing to say. */
export function hintFor(step, { hasParts = false, nParts = 0, busy = false, nQuestions = 0 } = {}) {
  if (busy) return { key: 'as.busy', vars: {} };
  if (step === 1) return hasParts ? { key: nParts === 1 ? 'as.h1done1' : 'as.h1done', vars: { n: nParts } } : { key: 'as.h1', vars: {} };
  if (!hasParts) return { key: 'as.h1', vars: {} };
  if (step === 3) return nQuestions ? { key: 'as.h3q', vars: { n: nQuestions } } : { key: 'as.h3', vars: {} };
  return { key: 'as.h' + step, vars: {} };
}
/** Assistant on/off from settings: on unless explicitly turned off. */
export const assistantOn = (settings) => !settings || settings.assistant !== false;
