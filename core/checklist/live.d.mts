export const DEFAULT_PRECISION: Record<string, number>;
export const ROWS: { id: string; group: string; sub?: boolean }[];
export const GROUPS: string[];
export function thresholds(settings: any): Record<string, number>;
export function tightItems(chk: any, th: any): any[];
export function precisionLevel(tight: any[], read: boolean): { level: 'standard' | 'tight' | 'veryTight' | 'unknown'; count: number; tightest: any; veryCount: number };
export function complexity(part: any, ev: any): { level: 'simple' | 'moderate' | 'complex'; points: number; counts: Record<string, number> };
export function evaluate(part: any, settings: any): any;
