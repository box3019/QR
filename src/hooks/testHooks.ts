// Self-test hooks: exposes app state and actions on window.__qr* for the Playwright tests of the installed app.
export function exposeTestHooks(h: { setDetails: any; setStep: any; run: any; parts: any[]; rfqs: any[]; unknown: string[]; setDialog: any; select: any }) {
  const w = window as any;
  w.__qrDetails = h.setDetails; w.__qrStep = h.setStep; w.__qrRun = h.run; w.__qrParts = h.parts;
  w.__qrRfqs = h.rfqs; w.__qrUnknown = h.unknown; w.__qrSelect = h.select; w.__qrDialog = h.setDialog;
}
