// i18n: one place for UI strings. t(key, vars); setLang() switches language + document direction live.
import en from './en.json';
import he from './he.json';

export type Lang = 'en' | 'he';
const DICTS: Record<Lang, Record<string, string>> = { en, he };
let current: Lang = 'en';

export const getLang = () => current;
export function setLang(l: string) {
  current = l === 'he' ? 'he' : 'en';
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'he' ? 'rtl' : 'ltr';
}
export function t(key: string, vars?: Record<string, any>): string {
  const s = DICTS[current][key] ?? DICTS.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '') + '') : s;
}
/** Readiness text produced by core → localized label. */
export function tReadiness(r: string) {
  if (r === 'Ready' || r === 'Incomplete') return t('ready.' + r);
  if (r === 'n/a') return t('ready.na');
  if (r === 'Blocked: no material') return t('ready.noMaterial');
  const m = /^Blocked by (\d+)/.exec(r || ''); return m ? t('ready.byTasks', { n: m[1] }) : r;
}
/** Root font size per text-size option (whole UI scales via rem). */
export const TEXT_SIZES: Record<string, number> = { normal: 19, large: 21.5, xlarge: 24, huge: 28 };
export function setTextSize(size: string) { document.documentElement.style.fontSize = (TEXT_SIZES[size] || TEXT_SIZES.large) + 'px'; }
export const keysOf = (l: Lang) => Object.keys(DICTS[l]);
