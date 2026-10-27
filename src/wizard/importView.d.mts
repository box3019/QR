export type ImportFile = { name: string; status: 'waiting' | 'reading' | 'done' | 'check' };
export type ImportState = { mails: { subject: string; from: string }[]; files: ImportFile[]; active: boolean };
export function emptyImport(): ImportState;
export function startImport(v: ImportState | null, append?: boolean): ImportState;
export function reduceImport(v: ImportState | null, ev: any): ImportState | null;
export function finishImport(v: ImportState | null): ImportState | null;
export function importProgress(v: ImportState | null): { d: number; n: number; frac: number };
export function afterImport(step: number, nParts: number): number;
export function showDrop(v: ImportState | null, nParts: number): boolean;
