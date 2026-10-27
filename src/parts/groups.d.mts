export declare const GROUP_ORDER: string[];
export declare function plainStatus(part: any): 'ready' | 'needsAnswer' | 'needsDoc' | 'notOurs';
export declare function groupParts(parts: any[], statusOf?: (p: any) => string): { key: string; items: { part: any; index: number }[] }[];
export function tileCounts(parts: any[], statusOf?: (p: any) => string): Record<string, number>;
export function filterGroups(groups: any[], key: string | null): any[];
export const DOT: Record<string, string>;
