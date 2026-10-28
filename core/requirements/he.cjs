'use strict';
// requirements/he: Hebrew names for the extractor's vocabulary (categories, processes, masking, flags). Specs stay as written.
const N = {
  Material: 'חומר', Cleaning: 'ניקוי', Coating: 'ציפוי', 'Heat treat': 'טיפול תרמי', Marking: 'סימון', Masking: 'מיסוך', Machining: 'עיבוד', Assembly: 'הרכבה', Inspection: 'בקרה', Packing: 'אריזה', Paint: 'צביעה',
  'Stress relief': 'הפגת מאמצים', Annealing: 'חישול רך', 'Solution + aging': 'טיפול תמיסה והזדקנות', Normalizing: 'נרמול', Carburizing: 'קרבון', Nitriding: 'ניטרוד', Hardening: 'הקשיה', Tempering: 'הרפיה', 'Heat treat (general)': 'טיפול תרמי (כללי)',
  Anodize: 'אנודייז', 'Conversion coating (chem film)': 'ציפוי המרה כימי', 'Electroless nickel': 'ניקל כימי', 'Nickel plating (electrolytic/unspecified)': 'ציפוי ניקל (חשמלי / לא צוין)', 'Zinc-nickel': 'אבץ-ניקל', 'Zinc plating': 'ציפוי אבץ', 'Cadmium plating': 'ציפוי קדמיום', 'Chrome plating': 'ציפוי כרום', 'Tin plating': 'ציפוי בדיל', 'Silver plating': 'ציפוי כסף', 'Gold plating': 'ציפוי זהב', 'Copper plating': 'ציפוי נחושת', Passivation: 'פסיבציה', 'Black oxide': 'השחרה', Phosphate: 'פוספט', 'Dry film / PTFE': 'שכבת סיכה יבשה / טפלון', 'Plating (unspecified metal)': 'ציפוי (מתכת לא צוינה)', 'Electroless (other)': 'ציפוי כימי (אחר)',
  'Powder coat': 'צבע אבקה', Primer: 'פריימר', 'Top coat / paint': 'צבע עליון', 'Primer + Top coat / paint': 'פריימר וצבע עליון',
  Tape: 'סרט', Plug: 'פקק', 'Cap / boot': 'כיסוי', 'Lacquer / stop-off': 'לכה חוסמת', Wax: 'שעווה', 'Masking (method not stated)': 'מיסוך (השיטה לא צוינה)',
  Threads: 'הברגות', Holes: 'חורים', Bores: 'קדחים', 'Internal surfaces': 'משטחים פנימיים', 'Contact surfaces': 'משטחי מגע', 'Grounding / electrical': 'הארקה / מגע חשמלי', 'Sealing surfaces': 'משטחי אטימה', Datum: 'דאטום', 'Area per drawing': 'אזור לפי השרטוט',
  'Silver plating': 'ציפוי כסף', 'Gold plating': 'ציפוי זהב', 'Chrome plating': 'ציפוי כרום', 'Zinc plating': 'ציפוי אבץ', 'Tin plating': 'ציפוי בדיל', 'Glass bead blast': 'התזת מיקרו-כדורי זכוכית', Blasting: 'התזה', Passivation: 'פסיבציה',
  'Conversion coating': 'ציפוי המרה', Plating: 'ציפוי מתכתי',
};
/** "A; B (page-level)" -> Hebrew, each part translated when known. */
const he = (s) => String(s || '').split(/(\s*[;,|]\s*|\s*→\s*)/).map((p) => { const m = p.match(/^(.*?)( \(page-level\))?$/); return N[m[1]] ? N[m[1]] + (m[2] ? ' (ברמת הדף)' : '') : p; }).join('');
module.exports = { N, he };
