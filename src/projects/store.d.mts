export function newId(): string;
export function tabMeta(s: any): { key: string | null; label: string; customer: string; status: 'busy' | 'check' | 'ready' | 'empty'; frac: number; step: number; nParts: number; dirty: boolean; lastRun: any };
export function reorder<T>(list: T[], a: number, b: number): T[];
export function closeNeedsConfirm(m: any): boolean;
export function routeOutlook(tabs: any[], key: string | null, activeId: string): { kind: 'focus' | 'active' | 'new'; id?: string };
export function persisted(s: any): any;
