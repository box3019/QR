export function loadedSummary(parts: any[], files: string[], unknown?: string[]): { tiles: { parts: number; files: number; drawings: number; models: number }; groups: { index: number; partNo: string; rev: string; files: string[] }[]; other: string[]; unknown: string[] };
export const showLoaded: (view: any, nParts: number) => boolean;
