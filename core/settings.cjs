'use strict';
// settings: defaults + normalization of the stored settings object (pure; file IO stays in electron/main.cjs).
const { MATERIALS, PROCESSES, mergeCatalog } = require('./catalog/index.cjs');

const { mergeCustomers } = require('./customers/index.cjs');
const sanitizeFloatPos = (o) => { const out = {}; if (o && typeof o === 'object') for (const k of Object.keys(o)) { const p = o[k]; if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) out[k] = { x: Math.round(p.x), y: Math.round(p.y) }; } return out; };
// Interface options, mirroring MRT's Settings > Appearance (QR's own lists; ids are the CSS theme ids in src/styles/themes.css).
const PALETTES = ['aris-glass', 'icloud-windows', 'cleanmymac', 'priority-erp', 'industrial-steel', 'graphite', 'warm-neutral', 'soft-salad', 'soft-beige', 'soft-olive-gray', 'high-contrast']; // the 11 MRT built-in visual presets, in MRT's order
const ACCENTS = ['slate', 'blue', 'teal', 'amber'];
const DENSITIES = ['comfortable', 'normal', 'compact'];
const ROW_HEIGHTS = ['compact', 'normal', 'relaxed'];
const TEXT_SIZES = ['normal', 'large', 'xlarge', 'huge'];
const ASSISTANT_LANGS = ['he', 'en', 'ru'];
const ASSISTANT_CHOICES = ['auto', ...ASSISTANT_LANGS]; // 'auto' = the hints and the tutorial follow the program language (default)
const DEFAULTS = {
  uiLanguage: 'en', // program language: en | he
  assistantLanguage: 'auto', // tutorial + step hints: auto (= program language) | he | en | ru. A different language only when the user picked one (assistantLanguageSet)
  palette: 'industrial-steel', /* MRT's default preset */ accent: 'slate', density: 'normal', rowHeight: 'normal',
  firstRunDone: false,
  textSize: 'large',
  questionsLanguage: 'he',
  ocr: true,
  ocrDpi: 400,
  companyFolder: '',
  exportFolder: '',
  searchRoots: ['\\\\fileserver-sr\\erp$\\Inspection'],
  outlookDrag: true,
  outlookSaveFolder: '',
  assistant: true,
  floatPos: {}, // remembered positions of draggable windows: { key: { x, y } }
};
/** Pure: stored object -> full settings with the capability catalog merged over the defaults. */
function normalizeSettings(stored) {
  const s = { ...DEFAULTS, ...(stored || {}) };
  if (stored && !('uiLanguage' in stored)) s.textSize = 'large'; // pre-0.1.3: old default was small
  if (!TEXT_SIZES.includes(s.textSize)) s.textSize = 'large';
  const hadAssistant = stored && ASSISTANT_LANGS.includes(stored.assistantLanguage);
  if (!['en', 'he'].includes(s.uiLanguage)) { // 0.1.5 build 1 allowed 'ru' as the one language: keep Russian for the assistant, English UI
    if (s.uiLanguage === 'ru' && !hadAssistant) s.assistantLanguage = 'ru';
    s.uiLanguage = 'en';
  }
  // one clear rule: the hints follow the program language unless the user explicitly picked another language in Settings > Assistant
  if (!ASSISTANT_CHOICES.includes(s.assistantLanguage) || (s.assistantLanguage !== 'auto' && !s.assistantLanguageSet && !(!hadAssistant && s.assistantLanguage === 'ru'))) s.assistantLanguage = 'auto';
  if (s.assistantLanguage !== 'auto') s.assistantLanguageSet = true;
  if (!PALETTES.includes(s.palette)) s.palette = DEFAULTS.palette;
  if (!ACCENTS.includes(s.accent)) s.accent = DEFAULTS.accent;
  if (!DENSITIES.includes(s.density)) s.density = DEFAULTS.density;
  if (!ROW_HEIGHTS.includes(s.rowHeight)) s.rowHeight = DEFAULTS.rowHeight;
  s.assistant = s.assistant !== false;
  s.floatPos = sanitizeFloatPos(s.floatPos);
  delete s.materials; // pre-0.1.3 regex allow-list, replaced by the catalog
  s.materialsCatalog = mergeCatalog(MATERIALS, s.materialsCatalog);
  s.processesCatalog = mergeCatalog(PROCESSES, s.processesCatalog);
  s.customers = mergeCustomers(stored && stored.customers);
  return s;
}
/** Pure: settings -> the catalog object the checks use. */
const catalogOf = (s) => ({ materials: s.materialsCatalog, processes: s.processesCatalog });
/** The concrete language of the hints and the tutorial for a settings object. */
const resolveAssistantLang = (s) => (s && s.assistantLanguage && s.assistantLanguage !== 'auto' ? s.assistantLanguage : (s && s.uiLanguage) === 'he' ? 'he' : 'en');
module.exports = { resolveAssistantLang, ASSISTANT_CHOICES, DEFAULTS, normalizeSettings, catalogOf, PALETTES, ACCENTS, DENSITIES, ROW_HEIGHTS, TEXT_SIZES, ASSISTANT_LANGS };
