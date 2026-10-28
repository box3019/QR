'use strict';
// catalog/families: material whitelist by FAMILY / GROUP, so every alloy of a family we machine is "ours" without a catalog row per alloy.
// parseMaterial(text) normalises any material callout to { group, family, grade, temper, form, stock, uns, specs, name }.
// The groups are rows in Settings > Materials (rule: true, editable on/off); explicit alloy rows still win (see catalog/index.cjs matchMaterial).
// Copper-base: brass and bronze are ours (Alex, 2026-10-28); pure copper, Cu-Be, cupro-nickel and nickel silver are NOT assumed (row off by default).
const { stockOf } = require('../routing/chart.cjs');

const GROUPS = [
  { group: 'aluminium-wrought', family: 'Aluminium', grade: '1xxx-8xxx', en: 'Aluminium, all wrought alloys (1xxx-8xxx), all tempers', he: 'אלומיניום, כל הסגסוגות המהוּנדסות (1xxx-8xxx), כל המצבים', on: true },
  { group: 'aluminium-cast', family: 'Aluminium', grade: 'cast', en: 'Aluminium, cast alloys (A356, 356, 319, A380...)', he: 'אלומיניום, סגסוגות יציקה (A356, 356, 319, A380...)', on: true },
  { group: 'steel-carbon', family: 'Steel', grade: '10xx/11xx/12xx', en: 'Carbon steel (1018, 1045, 12L14, S355...)', he: 'פלדת פחמן (1018, 1045, 12L14, S355...)', on: true },
  { group: 'steel-alloy', family: 'Steel', grade: '41xx/43xx/86xx...', en: 'Alloy steel (4130, 4140, 4340, 8620, 9310, 42CrMo4...)', he: 'פלדה מסוגסגת (4130, 4140, 4340, 8620, 9310, 42CrMo4...)', on: true },
  { group: 'stainless', family: 'Stainless steel', grade: '3xx/4xx/PH', en: 'Stainless steel (303, 304, 316, 416, 17-4PH, 15-5PH...)', he: 'נירוסטה (303, 304, 316, 416, 17-4PH, 15-5PH...)', on: true },
  { group: 'tool-steel', family: 'Tool steel', grade: 'A2/D2/O1/H13...', en: 'Tool steel (A2, D2, O1, S7, H13, M2...)', he: 'פלדת כלים (A2, D2, O1, S7, H13, M2...)', on: true },
  { group: 'brass', family: 'Brass', grade: 'C2xxxx-C4xxxx', en: 'Brass (C26000, C36000, C46400, CuZn37, CuZn39Pb3...)', he: 'פליז (C26000, C36000, C46400, CuZn37, CuZn39Pb3...)', on: true },
  { group: 'bronze', family: 'Bronze', grade: 'C5xxxx-C6xxxx, C9xxxx', en: 'Bronze (phosphor C51000/C54400, aluminium C95400/C63000, tin C93200, CuSn8, CuAl10Ni5Fe4...)', he: 'ברונזה (פוספור C51000/C54400, אלומיניום C95400/C63000, בדיל C93200, CuSn8, CuAl10Ni5Fe4...)', on: true },
  { group: 'plastic-pom', family: 'Plastic', grade: 'POM', en: 'Delrin (POM / acetal) plastic', he: 'דלרין (POM / אצטל), פלסטיק', on: true },
  { group: 'plastic-ptfe', family: 'Plastic', grade: 'PTFE', en: 'Teflon (PTFE) plastic', he: 'טפלון (PTFE), פלסטיק', on: true },
  { group: 'copper-other', family: 'Copper', grade: 'C1xxxx, C17200, C7xxxx', en: 'Copper, Cu-Be, cupro-nickel, nickel silver (confirm before enabling)', he: 'נחושת, Cu-Be, קופרו-ניקל, כסף ניקל (לאשר לפני הפעלה)', on: false },
];
/** Rows for the materials catalog (Settings > Materials). */
const GROUP_ROWS = GROUPS.map((g) => ({ id: 'grp-' + g.group, rule: true, group: g.group, family: g.family, grade: g.grade, nameEn: g.en, nameHe: g.he, aliases: [], tempers: [], enabled: g.on }));

const up = (s) => String(s || '').toUpperCase().replace(/_/g, ' ').replace(/ALUMINIUM/g, 'ALUMINUM').replace(/\s+/g, ' ');
const NAMES = { 'aluminium-wrought': 'Aluminium', 'aluminium-cast': 'Aluminium (cast)', 'steel-carbon': 'Carbon steel', 'steel-alloy': 'Alloy steel', stainless: 'Stainless steel', 'tool-steel': 'Tool steel', brass: 'Brass', bronze: 'Bronze', 'plastic-pom': 'Delrin (POM)', 'plastic-ptfe': 'Teflon (PTFE)', 'copper-other': 'Copper alloy' };
const FAMILY = { 'aluminium-wrought': 'Aluminium', 'aluminium-cast': 'Aluminium', 'steel-carbon': 'Steel', 'steel-alloy': 'Steel', stainless: 'Stainless steel', 'tool-steel': 'Tool steel', brass: 'Brass', bronze: 'Bronze', 'plastic-pom': 'Plastic', 'plastic-ptfe': 'Plastic', 'copper-other': 'Copper' };

// ---- copper base ----
function copperGroupFromUns(n) { // n = 5 digits after C
  const a = +n.slice(0, 3), x = +n.slice(0, 2);
  if (x >= 20 && x <= 49) return 'brass';           // C2xxxx-C4xxxx coppers-zinc brasses, leaded, tin brass
  if (x >= 50 && x <= 52) return 'bronze';          // phosphor bronze
  if (x === 53 || x === 54) return 'bronze';        // C54400 leaded phosphor bronze
  if (x >= 60 && x <= 64) return 'bronze';          // aluminium bronzes
  if (x === 65) return 'bronze';                    // silicon bronze
  if (x >= 66 && x <= 69) return a === 668 || x === 66 ? 'brass' : 'bronze'; // C66xxx brasses, C67500 manganese bronze, C68700 Al brass
  if (x >= 83 && x <= 85) return 'brass';          // cast red / semi-red / yellow brass
  if (x >= 86 && x <= 87) return 'bronze';         // manganese / silicon bronze (cast)
  if (x >= 90 && x <= 95) return 'bronze';         // tin, leaded tin, Al bronze (cast)
  return 'copper-other';
}
function copperGroupFromEn(code) {
  const m = code.match(/^C([WCBR])(\d{3})[A-Z]$/); if (!m) return null;
  const n = +m[2];
  if (m[1] === 'W') return n >= 300 && n < 500 ? 'bronze' : n >= 500 && n < 700 ? 'brass' : 'copper-other';
  if (m[1] === 'C') return n >= 330 && n < 340 ? 'bronze' : n >= 480 && n < 500 ? 'bronze' : n >= 750 && n < 800 ? 'brass' : n >= 380 && n < 400 ? 'bronze' : 'copper-other';
  return 'copper-other';
}
function copper(u, raw) {
  let uns = (u.match(/\b(?:UNS[\s-]*)?C(\d{5})\b/) || [])[1];
  let en = (u.match(/\bC([WCBR]\d{3}[A-Z])\b/) || [])[1];
  const cu = u.match(/\bCU(ZN|SN|AL|SI|MN|NI|BE|PB|P)\d*[A-Z0-9.]*\b/);
  const named = /\bBRASS\b/.test(u) ? 'brass' : /\bBRONZE\b|\bGUNMETAL\b|\bGUN METAL\b/.test(u) ? 'bronze' : /\bCOPPER\b|CUPRO|NICKEL SILVER/.test(u) && !/\bPLATING\b/.test(u) ? 'copper-other' : null;
  let group = null, grade = '';
  if (uns) { group = copperGroupFromUns(uns); grade = 'C' + uns; }
  else if (en) { group = copperGroupFromEn('C' + en); grade = en.startsWith('W') || en.startsWith('C') ? 'C' + en : en; }
  else if (cu) { const k = cu[1]; group = k === 'ZN' ? 'brass' : ['SN', 'AL', 'SI', 'MN', 'P'].includes(k) ? 'bronze' : k === 'PB' ? 'bronze' : 'copper-other'; const o = String(raw || '').match(/\bCu(?:Zn|Sn|Al|Si|Mn|Ni|Be|Pb|P)[A-Za-z0-9.]*/i); grade = o ? 'Cu' + o[0].slice(2).replace(/^(.)(.)/, (s, a, b) => (/[a-z]/.test(a) ? a.toUpperCase() : a) + (/[A-Z]/.test(b) && /[A-Z]/.test(o[0].slice(2, 3)) ? b.toLowerCase() : b)) : cu[0]; }
  else if (named) { group = named; }
  if (!group && /\b(ASTM\s*B\s*(16|21|36|124|134|135|138|139|103|105|150|152|169|171|194|196|197|206|283|371|427|505|584|1|30|62|139|271|301|369|463|473|550)|QQ-B-\d{3}|QQ-C-\d{3}|AMS\s*4[56]\d{2}|MIL-B-\d+|DIN\s*17660|DIN\s*17662|DIN\s*17672)\b/.test(u)) {
    const m = u.match(/ASTM\s*B\s*(\d+)/);
    const brass = m && ['16', '21', '36', '121', '124', '134', '135', '171', '283'].includes(m[1]);
    const bronze = m && ['103', '139', '150', '169', '271', '427', '505', '584', '30', '62'].includes(m[1]);
    group = brass ? 'brass' : bronze ? 'bronze' : /QQ-B-6[0-9]{2}|DIN\s*1766/.test(u) ? 'brass' : /QQ-B-7|QQ-C-465|AMS\s*46/.test(u) ? 'bronze' : /AMS\s*45/.test(u) ? 'brass' : m && m[1] === '152' ? 'copper-other' : 'bronze';
  }
  if (!group) return null;
  // a trailing alloy word in the text refines nothing: grade stays as printed
  return { group, grade };
}

// ---- aluminium ----
const AL_EN = [[/ALMGSI1/, '6082'], [/ALMGSI0\.?5/, '6060'], [/ALMG4\.?5MN/, '5083'], [/ALMG3\b/, '5754'], [/ALMG2\.?5/, '5052'], [/ALZN5\.?5MGCU/, '7075'], [/ALCU4MG1/, '2024'], [/ALCU4SIMG/, '2014'], [/AL99\.?5|AL99\b/, '1050'], [/ALMN1CU/, '3003']];
const SPECPRE = /(AMS|ASTM|QQ-A-|DIN|EN|MIL-[A-Z]-|ISO|SAE|AS|MS|NAS)[\s\-]*[A-Z]?[\s\-]*$/;
function aluminium(u) {
  const ctxAl = /\b(?:1050|1060|1100|2011|2014|2017|2024|2219|3003|3004|5005|5052|5083|5086|5154|5454|5456|6005|6013|6061|6063|6082|7001|7050|7068|7075|7175|7178)\b|\b[1-8]\d{3}[\s-]?(?:T\d{1,4}|H\d{2,3}|O)\b|(?<!ASTM\s?)\bA[2-7]\d{2}(?:\.\d)?\b|\b[2-7]\d{2}\.\d-T\d|ALUM|\bAL[\s.-]?\d|\bAA[\s-]?\d|\bA9\d{4}\b|\bA0\d{4}\b|ALMG|ALSI|ALCU|ALZN|ALMN|EN[\s-]?AW|\bAW[\s-]?\d{4}|QQ-A-(?:250|225|200|367|601|596|430)|ASTM\s*B\s*(?:209|210|211|221|241|247|308|429|928|26|108|179)\b|AMS[\s-]*(?:QQ-A-\d+\/?\d*|4[0-3]\d{2})\b/.test(u);
  if (!ctxAl) return null;
  if (/\bSTEEL\b|STAINLESS|\bCRES\b/.test(u) && !/ALUM/.test(u)) return null; // "STAINLESS STEEL ... ASTM A240" is not cast aluminium A240
  let grade = '', group = 'aluminium-wrought';
  const uns = u.match(/\bA9(\d{4})\b/); if (uns) grade = uns[1];
  const unsCast = u.match(/\bA0(\d{4})\b/); if (!grade && unsCast) { group = 'aluminium-cast'; grade = unsCast[1].replace(/^(\d{3})(\d)$/, (m, a, b) => a + (b === '0' ? '' : '.' + b)); }
  if (!grade) for (const [re, g] of AL_EN) if (re.test(u.replace(/[\s-]/g, ''))) { grade = g; break; }
  if (!grade && /ALSI\d{1,2}(MG|CU|\b)/.test(u.replace(/[\s-]/g, ''))) { group = 'aluminium-cast'; grade = (u.replace(/[\s-]/g, '').match(/ALSI\d{1,2}[A-Z0-9]*/) || [''])[0]; }
  if (!grade) { // wrought 1xxx-8xxx, not the number of a spec
    for (const m of u.matchAll(/(?<![\d.\/])([1-8]\d{3})(?![\d.])/g)) {
      const before = u.slice(Math.max(0, m.index - 10), m.index);
      if (SPECPRE.test(before)) continue;
      grade = m[1]; break;
    }
  }
  if (!grade) { // cast: A356 / 356.0 / 319 / A380 with a cast context or an A prefix
    const c = u.match(/(?<![\d.\/A-Z])((?:A|B|C|F)?(?:2[0-9]{2}|3[0-9]{2}|4[0-9]{2}|5[0-3][0-9]|7[0-9]{2}))(?:\.[0-2])?(?![\d])/);
    const castCtx = /\bCAST(ING)?\b|AMS[\s-]*42\d{2}|QQ-A-(?:601|596)|ASTM\s*B\s*(?:26|108|179)\b|\bSAND\b|PERMANENT MOLD|\bDIE\b/.test(u);
    if (c && !SPECPRE.test(u.slice(Math.max(0, c.index - 10), c.index)) && (castCtx || /^[ABCF]/.test(c[1]))) { group = 'aluminium-cast'; grade = c[1]; }
  }
  if (!grade && /AMS[\s-]*4[2][0-9]{2}/.test(u)) group = 'aluminium-cast';
  return { group, grade };
}

// ---- steels ----
const STAINLESS_RE = /\b17[\s-]?4[\s-]?PH\b|\b15[\s-]?5[\s-]?PH\b|\b13[\s-]?8[\s-]?MO\b|PH\s?13[\s-]?8|\b17[\s-]?7[\s-]?PH\b|\b15[\s-]?7[\s-]?PH\b|\bA[\s-]?286\b|\bCUSTOM\s*4[56]0\b/;
const STEEL_CTX = /STEEL|STAINLESS|CRES|\bSS\b|\bINOX\b|AISI|\bSAE\b|UNS[\s-]*[GSKT]\d{5}|\b[GSKT]\d{5}\b|ASTM\s*A\s*\d{2,3}|AMS[\s-]*[56]\d{3}|MIL-[ST]-\d+|QQ-S-\d+|\bW\.?\s?NR|\b1\.[0-7]\d{3}\b|\bDIN\b|\bEN[\s-]?10\d{3}/;
function steel(u, raw) {
  const uns = (u.match(/\b(?:UNS[\s-]*)?([GSKT])(\d{5})\b/) || []);
  const spec = (u.match(/\bAMS[\s-]*([56]\d{3})\b/) || [])[1];
  const astm = (u.match(/\bASTM\s*A\s*(\d{2,4})\b/) || [])[1];
  const ctx = STEEL_CTX.test(u);
  const short = u.length <= 30;
  let group = null, grade = '';
  if (STAINLESS_RE.test(u)) { group = 'stainless'; grade = (u.match(STAINLESS_RE) || [''])[0].replace(/[\s-]/g, '').replace(/^(\d+)(\d)PH/, '$1-$2PH').replace(/(\d)(\d)(PH)/, '$1-$2$3'); grade = grade.replace(/^(\d{2})(\d)PH$/, '$1-$2PH'); }
  if (!group && uns[1] === 'S') { group = 'stainless'; grade = 'S' + uns[2]; }
  if (!group && uns[1] === 'T') { group = 'tool-steel'; grade = 'T' + uns[2]; }
  if (!group && uns[1] === 'G') { group = /^G1[0-5]/.test('G' + uns[2]) ? 'steel-carbon' : 'steel-alloy'; grade = 'G' + uns[2]; }
  if (!group && uns[1] === 'K') { group = 'steel-alloy'; grade = 'K' + uns[2]; }
  if (!group && /\bX\d{1,3}CR(?:NI|MO|TI|S)?[A-Z0-9-]*/.test(u.replace(/\s/g, ''))) { group = 'stainless'; grade = (u.replace(/\s/g, '').match(/\bX\d{1,3}CR[A-Z0-9-]*/) || [''])[0]; }
  if (!group && /\b1\.4\d{3}\b/.test(u)) { group = 'stainless'; grade = u.match(/\b1\.4\d{3}\b/)[0]; }
  if (!group && /\b1\.2\d{3}\b/.test(u)) { group = 'tool-steel'; grade = u.match(/\b1\.2\d{3}\b/)[0]; }
  if (!group && /\b1\.(?:[57]\d{3}|65\d{2}|35\d{2})\b/.test(u)) { group = 'steel-alloy'; grade = u.match(/\b1\.(?:[57]\d{3}|65\d{2}|35\d{2})\b/)[0]; }
  if (!group && /\b1\.0\d{3}\b/.test(u)) { group = 'steel-carbon'; grade = u.match(/\b1\.0\d{3}\b/)[0]; }
  if (!group && /\b(?:\d{2}CR(?:MO|NIMO|V|MOV)\d*|\d{2}(?:MN|CRMO|NICRMO)[A-Z0-9]*|100CR6)\b/.test(u.replace(/\s/g, '')) ) { const t = u.replace(/\s/g, '').match(/\b(?:\d{2}CR(?:MO|NIMO|V|MOV)\d*|\d{2}(?:MN|CRMO|NICRMO)[A-Z0-9]*|100CR6)\b/); if (t && /CR|MN/.test(t[0])) { group = 'steel-alloy'; const o = String(raw || '').replace(/\s/g, '').match(/\b(?:\d{2}CR(?:MO|NIMO|V|MOV)\d*|\d{2}(?:MN|CRMO|NICRMO)[A-Za-z0-9]*|100CR6)\b/i); grade = o ? o[0] : t[0]; } }
  if (!group && /(?:^|[^A-Z0-9])(S235|S275|S355|ST37|ST52|ST\s?37|ST\s?52|C22|C35|C45|C60|E295|E335|E360)[A-Z0-9]*\b/.test(u) && (ctx || short)) { group = 'steel-carbon'; grade = (u.match(/(S235|S275|S355|ST\s?37|ST\s?52|C22|C35|C45|C60|E295|E335|E360)[A-Z0-9]*/) || [''])[0]; }
  if (!group && /^(30[1-5]|309|310S?|31[67]|321|347|41[0-6]|420|430|440[ABC]?)(L|F|SE)?$/.test(u.trim())) { group = 'stainless'; grade = u.trim(); }
  if (!group && /\b(17-4|15-5|13-8|17-7|15-7)\b/.test(u) && /CRES|STAINLESS|\bSS\b|AMS|ASTM/.test(u)) { group = 'stainless'; grade = u.match(/\b(17-4|15-5|13-8|17-7|15-7)\b/)[1]; }
  if (!group && (ctx || short)) {
    let m;
    if ((m = u.match(/(?<![\d.\/A-Z])(30[1-9]|31[0-9]|32[0-9]|34[0-9]|40[0-9]|41[0-9]|42[0-9]|43[0-9]|44[0-9]|46[0-9]|630)(L|F|SE|S|N|C|H)?(?![\d.])/)) && /STAINLESS|CRES|\bSS\b|\bINOX\b|\b(?:AISI|SAE|TYPE)[\s-]*(?:30[1-9]|31\d|32\d|34\d|4[0-6]\d)(?:L|F|SE|S|N|C|H)?(?![\d.])|ASTM\s*A\s*(?:167|182|240|276|312|314|479|484|564|580|582|666|693)|AMS[\s-]*5[5-6]\d{2}|UNS[\s-]*S|QQ-S-763|QQ-S-766|A2-70|A4-80/.test(u) && !/STEEL\s*4\d{3}/.test(u)) { group = 'stainless'; grade = m[1] + (m[2] || ''); }
    else if ((m = u.match(/(?<![\d.\/A-Z])(41[0-9]{2}|43[0-9]{2}|86[0-9]{2}|87[0-9]{2}|88[0-9]{2}|92[0-9]{2}|93[0-9]{2}|94[0-9]{2}|98[0-9]{2}|51[0-9]{2}|61[0-9]{2}|52100|81B45|4330V|300M|8630|9310)(?![\d.])/))) { group = 'steel-alloy'; grade = m[1]; }
    else if ((m = u.match(/(?<![\d.\/A-Z])(10[0-9]{2}|11[0-9]{2}|12L14|12[0-9]{2}|15[0-9]{2})(?![\d.])/)) && (/STEEL|AISI|\bSAE\b|UNS|ASTM\s*A|MILD|CARBON|\bC\.?R\.?S?\b|COLD|HOT ROLLED/.test(u) || short)) { group = 'steel-carbon'; grade = m[1]; }
    else if ((m = u.match(/\b(A2|A6|D2|D3|O1|O2|S7|H11|H13|M2|M42|T1|P20|W1|L6)\b/)) && /TOOL|\bAISI\b|DIE STEEL|\bHSS\b/.test(u)) { group = 'tool-steel'; grade = m[1]; }
    else if (/\bTOOL\s+STEEL\b|\bHSS\b|\bHIGH SPEED STEEL\b/.test(u)) { group = 'tool-steel'; }
    else if (/\bSTAINLESS\b|\bCRES\b|\bINOX\b/.test(u)) { group = 'stainless'; }
    else if (/\b(MILD|CARBON|LOW CARBON|STRUCTURAL)\s+STEEL\b|\bCR\s?STEEL\b|\bCOLD\s+ROLLED\b/.test(u)) { group = 'steel-carbon'; }
    else if (/\bALLOY\s+STEEL\b|\bCHROME[\s-]?MOLY\b|\bCR-?MO\b/.test(u)) { group = 'steel-alloy'; }
  }
  if (!group && spec) { const n = +spec; group = n >= 6000 ? 'steel-alloy' : n >= 5500 && n <= 5659 ? 'stainless' : n < 5500 ? 'steel-carbon' : null; }
  if (!group && astm) {
    group = /^(167|182|240|269|270|276|312|314|479|484|564|565|580|582|666|693|705)$/.test(astm) ? 'stainless' : /^(322|331|434|519|304|29|193|194)$/.test(astm) && /ALLOY|41|43|86/.test(u) ? 'steel-alloy' : /^(29|36|53|105|106|108|513|568|576|1008|1011|1018)$/.test(astm) ? 'steel-carbon' : null;
  }
  if (!group) {
    const q = u.match(/\bQQ-S-(\d{3})\b/); if (q) group = q[1] === '763' || q[1] === '766' ? 'stainless' : q[1] === '624' ? 'steel-alloy' : 'steel-carbon';
    else if (/\bMIL-S-(5000|6758|7720|8503|18729|6049)\b/.test(u)) group = 'steel-alloy';
  }
  return group ? { group, grade } : null;
}

// ---- common ----
const FORMS = [[/\bPLATE\b/, 'plate'], [/\bSHEET\b|\bSHT\b/, 'sheet'], [/\bBAR\b/, 'bar'], [/\bROD\b/, 'rod'], [/\bTUBE\b|\bTUBING\b|\bPIPE\b/, 'tube'], [/\bEXTRUD|\bEXTRUSION\b/, 'extrusion'], [/\bFORG(ING|ED)\b/, 'forging'], [/\bCASTING\b|\bCAST\b/, 'casting'], [/\bANGLE\b/, 'angle'], [/\bWIRE\b/, 'wire'], [/\bHEX\b/, 'hex bar']];
const formOf = (u) => { for (const [re, f] of FORMS) if (re.test(u)) return f; return ''; };
function temperOfGrade(u, grade, group) {
  if (/^aluminium/.test(group)) {
    const esc = grade.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = (grade && u.match(new RegExp(esc + '(?:\\.\\d)?\\s*[-,/ ]?\\s*(T\\d{1,5}|H\\d{2,3}|O|F|W)(?![A-Z0-9])'))) || u.match(/[-\s](T\d{2,5}|H[1-3]\d)(?![A-Z0-9])/);
    return m ? m[1] : '';
  }
  if (group === 'stainless') { const m = u.match(/\b(H\s?(?:9|10|11)\d{2}|CONDITION\s+[A-Z]|COND\.?\s+[A-Z])\b/); return m ? m[1].replace(/\s/g, '') : ''; }
  if (group === 'brass' || group === 'bronze' || group === 'copper-other') { const m = u.match(/(?<![A-Z0-9])(H\d{2}|HR\d{2}|O\d{2}|M\d{2}|T[BDFH]\d{2}|TQ\d{2}|TH\d{2})(?![A-Z0-9])/); return m ? m[1] : ''; }
  return '';
}
function stockGeneric(u) {
  const s = stockOf(u); if (s) return s;
  const m = u.match(/(\d+(?:\.\d+)?)\s*(?:"|IN\b|INCH)?\s*[X×]\s*(\d+(?:\.\d+)?)\s*(?:"|IN\b|INCH)?(?:\s*[X×]\s*(\d+(?:\.\d+)?))?\s*(INCH(?:ES)?|IN\b|MM|CM|")?/);
  if (m && m[3]) return { l: +m[1], w: +m[2], t: +m[3], d: null, unit: /^IN|"|INCH/.test(m[4] || '') ? 'inch' : (m[4] || '').toLowerCase() };
  const d = u.match(/(?:Ø|DIA\.?|DIAMETER|ROUND)\s*(\d+(?:\.\d+)?)\s*(INCH|IN\b|MM|")?/);
  return d ? { l: null, w: null, t: null, d: +d[1], unit: /^IN|"|INCH/.test(d[2] || '') ? 'inch' : (d[2] || 'mm').toLowerCase() } : null;
}
function specsOf(u) {
  const out = [];
  for (const re of [/\bAMS[\s-]*(?:QQ-A-\d+\/\d+|[A-Z]-\d+|\d{4}[A-Z]?)\b/g, /\bQQ-[A-Z]-\d+(?:\/\d+)?\b/g, /\bASTM\s*[AB]\s*\d{2,4}\b/g, /\bMIL-[A-Z]-\d+[A-Z]?\b/g, /\b(?:DIN|EN)\s*\d{3,6}\b/g]) for (const m of u.matchAll(re)) out.push(m[0].replace(/\s+/g, ' ').replace(/^(ASTM [AB])\s*/, '$1'));
  return [...new Set(out)];
}
/** text -> normalised material or null when it is not recognisably a metal we classify. */
function parseMaterial(raw) {
  const u = up(raw);
  if (!u.trim()) return null;
  // plastics we machine (Delrin / POM / acetal, Teflon / PTFE) are ours
  if (/\bDELRIN\b|\bPOM(?:-[CH])?\b|\bACETAL\b|\bPOLYOXYMETHYLENE\b/.test(u) && !/\bALUMIN|\bSTEEL\b|\bBRASS\b|\bBRONZE\b/.test(u)) return { group: 'plastic-pom', family: 'Plastic', grade: 'POM', temper: '', form: formOf(u), stock: stockGeneric(u), uns: '', specs: [], name: 'Delrin (POM)' };
  if (/\bPTFE\b|\bTEFLON\b|\bPOLYTETRAFLUOROETHYLENE\b/.test(u) && !/\bALUMIN|\bSTEEL\b|\bBRASS\b|\bBRONZE\b/.test(u)) return { group: 'plastic-ptfe', family: 'Plastic', grade: 'PTFE', temper: '', form: formOf(u), stock: stockGeneric(u), uns: '', specs: [], name: 'Teflon (PTFE)' };
  // order matters: "ALUMINUM BRONZE" is bronze; copper-base first, then aluminium, then steels
  const cu0 = copper(u, raw); let r = cu0 ? { ...cu0 } : null;
  if (!r) r = aluminium(u);
  if (!r) r = steel(u, raw);
  if (!r) return null;
  const temper = temperOfGrade(u, r.grade, r.group);
  const form = formOf(u);
  const stock = stockGeneric(u);
  const uns = (u.match(/\b(?:UNS[\s-]*)?([ACGKST]\d{5})\b/) || [])[1] || '';
  const family = FAMILY[r.group];
  const label = r.group === 'aluminium-cast' ? 'Aluminium' : NAMES[r.group];
  const name = `${label}${r.grade ? ' ' + r.grade : ''}${temper ? '-' + temper : ''}`;
  return { group: r.group, family, grade: r.grade, temper, form, stock, uns, specs: specsOf(u), name };
}
const FORM_HE = { plate: 'פלטה', sheet: 'יריעה', bar: 'מוט', rod: 'מוט עגול', tube: 'צינור', extrusion: 'פרופיל', forging: 'חלק מחושל', casting: 'יציקה', angle: 'זווית', wire: 'חוט', 'hex bar': 'מוט משושה' };
/** Stock size as printed on the card: 144×48×0.5" or Ø25 mm. */
function sizeText(s) {
  if (!s) return '';
  const u = s.unit === 'inch' ? '"' : s.unit ? ' ' + s.unit : '';
  const dims = [s.l, s.w, s.t].filter((x) => x != null);
  return dims.length ? dims.join('\u00d7') + u : s.d != null ? '\u00d8' + s.d + u : '';
}
/** One line for the card: "Aluminium 6061-T651, plate 144×48×0.5"". name overrides the (English) family+grade text, e.g. the Hebrew one. */
function oneLine(m, lang, name) {
  if (!m) return '';
  const form = lang === 'he' ? FORM_HE[m.form] || m.form : m.form;
  return [name || m.name, [form, sizeText(m.stock)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
module.exports = { GROUPS, GROUP_ROWS, parseMaterial, oneLine, sizeText, FORM_HE, copperGroupFromUns };


