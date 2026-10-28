'use strict';
// i18n/terms: Hebrew for the short terms core puts inside messages (materials, processes, locations, step types, reference descriptions).
const MATERIALS = require('../catalog/materials.json');
const PROCESSES = require('../catalog/processes.json');

const FAMILY = [[/Aluminium \(cast\)/g, 'אלומיניום יצוק'], [/Alloy steel/gi, 'פלדה מסוגסגת'], [/Carbon steel/gi, 'פלדת פחמן'], [/Tool steel/gi, 'פלדת כלים'], [/Copper(?! alloy)/g, 'נחושת'], [/Aluminium|Aluminum/g, 'אלומיניום'], [/Stainless steel/gi, 'פלדת אל-חלד'], [/Copper alloy/gi, 'סגסוגת נחושת'], [/Brass/gi, 'פליז'], [/Bronze/gi, 'ברונזה'], [/Titanium/gi, 'טיטניום'], [/Steel/gi, 'פלדה'], [/Plastics?/gi, 'פלסטיק'], [/Not in list/gi, 'לא ברשימה']];
/** Material name: catalog Hebrew name when known, family words translated; unknown raw text is quoted as drawing text. */
function mat(s) {
  s = String(s || '');
  const base = s.replace(/-[A-Z]\d+\w*$|-O$/, '');
  const e = MATERIALS.find((m) => m.nameEn === base);
  if (e && e.nameHe) return e.nameHe + s.slice(base.length);
  let out = s; let hit = false;
  for (const [re, he] of FAMILY) { re.lastIndex = 0; if (re.test(out)) { hit = true; re.lastIndex = 0; out = out.replace(re, he); } }
  return hit ? out : `"${s}"`;
}
const VOCAB = { Anodize: 'אנודייז', 'Chem film': 'ציפוי המרה כימי', Paint: 'צביעה', Passivation: 'פסיבציה', Plating: 'ציפוי גלווני', 'Heat treat': 'טיפול טרמי', Inserts: 'אינסרטים', 'Laser marking': 'סימון לייזר', 'DLC coating': 'ציפוי DLC', 'Black oxide': 'השחרה', Nitriding: 'ניטרידינג', 'Shot peening': 'ניקוי בכדוריות', 'Powder coat': 'צבע אבקתי', 'Silk screen': 'הדפסת משי', Welding: 'ריתוך' };
function proc(s) {
  const p = PROCESSES.find((x) => x.nameEn === s);
  return (p && p.nameHe) || VOCAB[s] || `"${s}"`;
}
const LOC = [
  [/^note (\S+)$/i, 'הערה $1'], [/^Note (\S+) \(title block: SEE NOTES\)$/, 'הערה $1 (אזור הכותרת: SEE NOTES)'],
  [/^Routing chart$/, 'טבלת מסלול'], [/^Routing chart (\S+)$/, 'טבלת מסלול $1'], [/^routing (\S+)$/, 'מסלול $1'],
  [/^step (\S+)$/i, 'שלב $1'], [/^parts list seq (\S+)$/i, 'רשימת חלקים, שורה $1'], [/^Parts list (.+)$/, 'רשימת חלקים $1'],
  [/^Drawing item table$/, 'טבלת פריטים בשרטוט'], [/^title block$/i, 'אזור הכותרת'], [/^view$/, 'מבט'],
  [/^PRODUCTION ROUTING CHART$/, 'טבלת מסלול ייצור'], [/^Drawing NOTES \+ PARTS LIST$/, 'הערות השרטוט + רשימת חלקים'], [/^Drawing NOTES$/, 'הערות השרטוט'],
];
function loc(s) { s = String(s || ''); for (const [re, he] of LOC) if (re.test(s)) return s.replace(re, he); return s; }
const INS = { 'heavy-duty': 'כבד', 'key-locked': 'נעילת מפתח', 'helical coil': 'סליל', insert: 'אינסרט', locking: 'נועל', 'non-locking': 'לא נועל', '': '' };
const ins = (s) => (s in INS ? INS[s] : s);
const UOM = { EA: "יח'", PCS: "יח'", PC: "יח'" };
const uom = (s) => UOM[String(s || '').toUpperCase()] || s;
const STEP = { general: 'כללי', material: 'חומר', machining: 'עיבוד', marking: 'סימון', surface: 'טיפול פני שטח', inserts: 'אינסרטים', inspection: 'בקרה', approval: 'אישור סופי', packing: 'אריזה', other: 'אחר', heat: 'טיפול טרמי', heattreat: 'טיפול טרמי', paint: 'צביעה', assembly: 'הרכבה', welding: 'ריתוך', cleaning: 'ניקוי', deburr: 'הסרת גרדים', process: 'תהליך' };
const step = (s) => STEP[s] || (s ? STEP.other : '');
const TITLE = { 'GENERAL INSTRUCTIONS': 'הוראות כלליות', MATERIAL: 'חומר', MACHINING: 'עיבוד', MARKING: 'סימון', 'SURFACE TREATMENT': 'טיפול פני שטח', 'INSERTS INSTALLATION': 'התקנת אינסרטים', INSPECTION: 'בקרה', 'FINAL APPROVAL': 'אישור סופי', PACKING: 'אריזה', INSERT: 'אינסרט' };
const title = (s) => (s ? TITLE[s] || s : '');
const DESC = {
  'Chemical conversion coatings on aluminium and aluminium alloys': 'ציפויי המרה כימיים לאלומיניום וסגסוגותיו',
  'Anodic coatings for aluminium and aluminium alloys': 'ציפויים אנודיים לאלומיניום וסגסוגותיו',
  'Ink, marking, epoxy base': 'דיו סימון על בסיס אפוקסי',
  'Aluminium alloy 6061-T6 sheet and plate': 'סגסוגת אלומיניום 6061-T6, פח ולוח',
  'Aluminium alloy 6061-T6 bars, rods, wire': 'סגסוגת אלומיניום 6061-T6, מוטות וחוט',
  'Aluminium alloy 6061 extruded bar, rod, shapes': 'סגסוגת אלומיניום 6061, מוטות ופרופילים משוכים',
  'Aluminium alloy bar/plate (former QQ-A spec)': 'סגסוגת אלומיניום, מוט / לוח (מפרט QQ-A לשעבר)',
  'Aluminium alloy extruded bars, rods, wire, profiles and tubes': 'סגסוגת אלומיניום משוכה: מוטות, חוט, פרופילים וצינורות',
  'Aluminium and aluminium-alloy sheet and plate': 'אלומיניום וסגסוגותיו, פח ולוח',
  'Autocatalytic (electroless) nickel-phosphorus coatings on metal': 'ציפוי ניקל-זרחן כימי (ללא זרם) על מתכת',
  'Coating, epoxy, high-solids': 'ציפוי אפוקסי עתיר מוצקים',
  'Colours used in government procurement': 'גווני צבע ברכש ממשלתי',
  'Inserts, screw-thread, helical coil': 'אינסרטים להברגה, סליל',
  'Identification marking of U.S. military property': 'סימון זיהוי לציוד צבאי אמריקאי',
  'Engineering drawing and dimensioning standards': 'תקני שרטוט הנדסי ומידות',
  'Dimensioning and tolerancing (legacy ANSI)': 'מידות וטולרנסים (תקן ישן)',
  'EU RoHS directive (restriction of hazardous substances)': 'הנחיית האיחוד האירופי להגבלת חומרים מסוכנים',
  'Engineering drawing practices': 'נוהלי שרטוט הנדסי',
  'Painting instructions and colours': 'הוראות צביעה וגוונים',
  'Insert (helical coil) installation data': 'נתוני התקנת אינסרטים (סליל)',
  'Identification marking specification': 'מפרט סימון זיהוי',
  'Hard anodizing process specification': 'מפרט תהליך אנודייז קשה',
  'Corrosion inhibitor for inserts': 'מעכב קורוזיה לאינסרטים',
  'RAFAEL document (RAFDOCS)': 'מסמך רפאל (RAFDOCS)',
  'RAFAEL catalog general requirement': 'דרישה כללית מקטלוג רפאל',
  'RAFAEL drawing interpretation procedure': 'נוהל רפאל לפענוח שרטוטים',
  'KLA cleaning specification': 'מפרט ניקוי של KLA',
  'KLA internal document': 'מסמך פנימי של KLA',
  'Elbit drawing / assembly': 'שרטוט / הרכבה של אלביט',
  'Next higher assembly (application data)': 'הרכבה עליונה (נתוני שימוש)',
  'Coating vendor internal process — performed by the vendor (outsourced)': 'תהליך פנימי של ספק הציפוי — מבוצע אצל הספק (קבלן חוץ)',
};
function desc(s) {
  if (!s) return '';
  if (DESC[s]) return DESC[s];
  const m = s.match(/^Separate part list for (.+)$/); if (m) return `רשימת חלקים נפרדת עבור ${m[1]}`;
  return /[A-Za-z]{3,}/.test(s) ? `"${s}"` : s;
}
const owner = (s) => (s === 'Plascotec (coating vendor)' ? 'Plascotec (ספק ציפוי)' : s);
module.exports = { mat, proc, loc, ins, uom, step, title, desc, owner, STEP, TITLE, DESC };
