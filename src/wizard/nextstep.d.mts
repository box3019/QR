export function nextAction(step: number, parts: any[], busy?: boolean): { key: string; vars: any; dot: 'ok' | 'warn' | 'none'; go: { step?: number; part?: number; action?: 'files' | 'export' } } | null;
export const nextWhy: (step: number, hasParts: boolean) => string | null;
export const cancelWhy: (hasParts: boolean) => string | null;
export const stepWhy: (n: number, hasParts: boolean) => string | null;
export const saveWhy: (nParts: number, busy: boolean) => string | null;
