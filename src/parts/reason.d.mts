export const LIST_ORDER: string[];
export function reasonFor(part: any): { status: string; prob?: any; text?: string; key?: string; vars?: any };
export function listRows(parts: any[], filter?: string | null): { part: any; index: number; status: string }[];
export function nextNeeding(parts: any[], sel: number): number;
export function arrowMove(key: string, rtl: boolean): number;
export const typing: (el: any) => boolean;
