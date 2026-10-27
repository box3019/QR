export type TLang = 'he' | 'ru' | 'en';
export type TourStep = { id: string; stage: number; target: string; demo: string | null };
export const TOUR: TourStep[];
export const TOUR_TEXT: Record<TLang, { dir: 'rtl' | 'ltr'; name: string; ui: Record<string, string>; demo: Record<string, string>; s: Record<string, [string, string]> }>;
export function tourFor(stage?: number): TourStep[];
export function tourLang(l: string): TLang;
