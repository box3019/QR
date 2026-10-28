// i18n: one place for UI strings. t(key, vars); setLang() switches language + document direction live.
import en from './en.json';
import he from './he.json';
import ru from './ru.json';

export type Lang = 'en' | 'he';
const DICTS: Record<Lang, Record<string, string>> = { en, he };
let current: Lang = 'en';
let content = 'en'; // the Settings language: he | en | ru. The UI itself falls back to English for ru (only tour and hints are Russian).

export const getLang = () => current;
/** The single language chosen in Settings (he | en | ru): used by the tour and the assistant hints. */
export const getContentLang = () => content;
export function setLang(l: string) {
  content = l === 'he' || l === 'ru' ? l : 'en';
  current = l === 'he' ? 'he' : 'en';
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'he' ? 'rtl' : 'ltr';
}
export function t(key: string, vars?: Record<string, any>): string {
  const s = DICTS[current][key] ?? DICTS.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '') + '') : s;
}
/** Assistant hint text in the Settings language (Russian when chosen, otherwise the UI language). */
export function tHint(key: string, vars?: Record<string, any>): string {
  const r = content === 'ru' ? (ru as Record<string, string>)[key] : undefined;
  return r ? (vars ? r.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '') + '') : r) : t(key, vars);
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
