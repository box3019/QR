export function clampPos(x: number, y: number, w: number, h: number, vw: number, vh: number, margin?: number): { x: number; y: number };
export function sanitizePos(p: any): { x: number; y: number } | null;
export function sanitizeFloatPos(o: any): Record<string, { x: number; y: number }>;
export const NO_DRAG: string;
