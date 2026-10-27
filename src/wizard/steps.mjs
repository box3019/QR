// Wizard flow: 4 steps, which step can be opened, and which toolbar buttons each step shows. Pure logic.
export const STEPS = [1, 2, 3, 4];
export const stepState = (n, cur) => (n === cur ? 'current' : n < cur ? 'done' : 'todo');
/** Step 1 is always open; steps 2-4 need loaded parts. Any open step can be clicked directly. */
export const canOpen = (n, hasParts) => n === 1 || !!hasParts;
export const nextStep = (cur) => Math.min(4, cur + 1);
/** Minimal UI: only the controls that step needs. */
export function toolbarFor(step, hasParts) {
  return { addFiles: step === 1, addFolder: step === 1, details: !!hasParts && step > 1, settings: true, help: true };
}
/** Tabs of the viewer in step 2: drawing + route always, model + data only with Details. */
export const viewerTabs = (details) => ['drawing', 'route', ...(details ? ['model', 'data'] : [])];
