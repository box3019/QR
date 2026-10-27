export declare const STEPS: number[];
export declare function stepState(n: number, cur: number): 'current' | 'done' | 'todo';
export declare function canOpen(n: number, hasParts: boolean): boolean;
export declare function nextStep(cur: number): number;
export declare function toolbarFor(step: number, hasParts: boolean): { addFiles: boolean; addFolder: boolean; details: boolean; settings: boolean; help: boolean };
export declare function viewerTabs(details: boolean): string[];
