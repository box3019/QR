export function isExternalDrop(types: any, internalDrag: boolean): boolean;
export function dropPlan(hasJob: boolean, curRfqs: any[], newRfqs: any[]): 'new' | 'append' | 'ask';
export function zoomStep(z: number, deltaY: number): number;
export function fitZoom(viewW: number, sheetW: number): number;
export function panTo(start: { left: number; top: number }, dx: number, dy: number): { left: number; top: number };
