'use strict';
// Built-in reference database: public standards (short description) and known customer-internal documents.
const PUBLIC = [
  [/^MIL-DTL-5541/, 'Chemical conversion coatings on aluminium and aluminium alloys'],
  [/^MIL-A-8625|^MIL-PRF-8625/, 'Anodic coatings for aluminium and aluminium alloys'],
  [/^A-A-56032/, 'Ink, marking, epoxy base'],
  [/^AMS[- ]?4027/, 'Aluminium alloy 6061-T6 sheet and plate'],
  [/^AMS[- ]?4117/, 'Aluminium alloy 6061-T6 bars, rods, wire'],
  [/^AMS[- ]?QQ-A-200\/8/, 'Aluminium alloy 6061 extruded bar, rod, shapes'],
  [/^AMS[- ]?QQ-A-2(25|50)/, 'Aluminium alloy bar/plate (former QQ-A spec)'],
  [/^ASTM B221/, 'Aluminium alloy extruded bars, rods, wire, profiles and tubes'],
  [/^ASTM B209/, 'Aluminium and aluminium-alloy sheet and plate'],
  [/^ASTM B733/, 'Autocatalytic (electroless) nickel-phosphorus coatings on metal'],
  [/^MIL-PRF-22750/, 'Coating, epoxy, high-solids'],
  [/^FED-STD-595/, 'Colours used in government procurement'],
  [/^NASM ?122076|^NASM ?8846|^MS ?1220/, 'Inserts, screw-thread, helical coil'],
  [/^MIL-STD-130/, 'Identification marking of U.S. military property'],
  [/^ASME Y14/, 'Engineering drawing and dimensioning standards'],
  [/^ANSI Y14/, 'Dimensioning and tolerancing (legacy ANSI)'],
  [/^2002-95\/EC|^ROHS/, 'EU RoHS directive (restriction of hazardous substances)'],
  [/^DOD-STD-100/, 'Engineering drawing practices'],
];
const INTERNAL = [
  ['ELTA', /^1002G151-001/, 'Painting instructions and colours'],
  ['ELTA', /^1011K500-001/, 'Insert (helical coil) installation data'],
  ['ELTA', /^5902N800-001/, 'Identification marking specification'],
  ['RAFAEL', /^PS-111\.21/, 'Hard anodizing process specification'],
  ['RAFAEL', /^PS-111\.29/, 'Corrosion inhibitor for inserts'],
  ['RAFAEL', /^RAFDOCS-/, 'RAFAEL document (RAFDOCS)'],
  ['RAFAEL', /^GEN_/, 'RAFAEL catalog general requirement'],
  ['RAFAEL', /^18\.00\.10/, 'RAFAEL drawing interpretation procedure'],
  ['KLA', /^905-\d{6}-\d{3}/, 'KLA cleaning specification'],
  ['KLA', /^0\d{6}-00X/, 'KLA internal document'],
  ['ELBIT', /^\d{4}-\d{4}-\d{2}[A-Z]{0,2}$/, 'Elbit drawing / assembly'],
];
const PATTERNS = [
  /\bMIL-(?:DTL|PRF|STD|A|C|F|S)-\d+[A-Z]?(?:\/\d+)?\b/g,
  /\bA-A-\d{4,}\b/g,
  /\b(?:SAE-)?AMS[- ]?(?:QQ-A-\d+\/\d+|\d{4}[A-Z]?)\b/g,
  /\bASTM [A-Z]\d{2,4}\b/g,
  /\bFED-STD-\d+\b/g,
  /\bNASM ?\d{4,}\b/g,
  /\bMS\d{6}\b/g,
  /\bASME Y14\.\d+[A-Z]*(?:-\d{4})?\b/g,
  /\bANSI Y14\.\d+[A-Z]*\b/g,
  /\b\d{4}[A-Z]\d{3}-\d{3}\b/g,
  /\bPS-\d+\.\d+\b/g,
  /\bRAFDOCS-\d+\b/g,
  /\bGEN_\d+-\d+\b/g,
  /\b905-\d{6}-\d{3}\b/g,
  /\b0\d{6}-00X\b/g,
  /\bPROCEDURE 18\.00\.10\b/g,
  /\b2002-95\/EC\b/g,
  /\bMIL-STD-130\b/g,
];
const CONTEXT = /\b(SEE ITEM|SEE|PER|IAW|IN ACCORDANCE WITH|SPECIFICATION|DATA|PROCEDURE|ACC\. TO)\b/;

function classify(number, customer) {
  const n = number.replace(/^SAE-/, '').replace(/^PROCEDURE /, '');
  for (const [re, d] of PUBLIC) if (re.test(n)) return { kind: 'public', description: d };
  for (const [c, re, d] of INTERNAL) if (re.test(n)) return { kind: 'internal', owner: c, description: d };
  return { kind: 'unknown', description: '' };
}

function findReferences(text, customer) {
  const out = new Map();
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        let num = m[0].replace(/^PROCEDURE /, '').replace(/\s+/g, ' ');
        if (/^MS\d{6}$/.test(num) && /INSERT/.test(text) === false) continue;
        const key = num.replace(/^SAE-/, '');
        if (out.has(key)) continue;
        const c = classify(key, customer);
        const ctx = (lines[i - 1] || '') + ' ' + line;
        out.set(key, { number: key, raw: line.trim().slice(0, 160), context: (ctx.match(CONTEXT) || [])[1] || '', ...c });
      }
    }
  });
  return [...out.values()];
}
module.exports = { findReferences, classify };
