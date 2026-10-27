export interface Busy { text: string; stage: string | null; i: number; n: number; progress: number | null; log: string[] }
export declare const startBusy: () => Busy;
export declare function reduceBusy(b: Busy | null, ev: any, msg?: (k: string, v?: any) => string): Busy | null;
export declare function progressView(b: Busy): { key: string; vars: { i: number; n: number }; frac: number | null; tech: string };
