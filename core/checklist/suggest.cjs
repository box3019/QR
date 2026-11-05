'use strict';
// Hole-size suggestions for checklist features when the drawing does not state the hole.
// Tap drill (threads), manufacturer STI/Keensert drill (inserts), H7 pin hole (dowels).
// Always marked suggested — never treated as a drawing callout.
const { parseThread } = require('../standards/threads.cjs');
const { stiRow, tables } = require('../standards/tables.cjs');

const HOLE_STATED = /(?:[\u00D8\u2300\u2205]|DIA\.?|DRILL|TAP[\s-]?DRILL|C['’]?BORE|CBORE|C['’]?SINK|CSK)\s*[\d.#]|[HG][6-9]\b/i;
// Helicoil metric STI tap drills (manufacturer charts, mm). Inch sizes come from helicoil_sti.json.
const HELICOIL_METRIC = { 'M2x0.4': 2.1, 'M2.5x0.45': 2.6, 'M3x0.5': 3.2, 'M3.5x0.6': 3.7, 'M4x0.7': 4.2, 'M5x0.8': 5.2, 'M6x1': 6.3, 'M8x1.25': 8.3, 'M10x1.5': 10.4, 'M12x1.75': 12.5, 'M14x2': 14.5, 'M16x2': 16.5 };
// Keensert metric tap drills (manufacturer charts, mm).
const KEENSERT_METRIC = { 'M2x0.4': 3.4, 'M2.5x0.45': 3.8, 'M3x0.5': 4.4, 'M4x0.7': 5.5, 'M5x0.8': 6.9, 'M6x1': 8.8, 'M8x1.25': 10.8, 'M10x1.5': 12.8, 'M12x1.75': 14.8 };
const r2 = (n) => Math.round(n * 100) / 100;
const blobOf = (it) => [it.spec, it.line].filter(Boolean).join(' ');
const holeStated = (it) => HOLE_STATED.test(blobOf(it));

function fmtDia(mm, unit) {
  if (!(mm > 0)) return '';
  if (unit === 'in') return '\u00D8' + (Math.round((mm / 25.4) * 10000) / 10000);
  return '\u00D8' + r2(mm) + ' mm';
}
function threadKey(th) {
  if (!th) return '';
  if (th.system === 'metric') return th.series + th.dia + 'x' + th.pitch;
  return th.raw.replace(/-\d[AB]$/, '').replace(/\s+/g, ' ').trim();
}
function isoTap(th) {
  if (!th || th.system !== 'metric') return null;
  const t = tables()['ISOM']; if (!t) return null;
  const row = t.rows[threadKey(th)] || t.rows['M' + th.dia + 'x' + th.pitch];
  return row && row.tapDrill > 0 ? row.tapDrill : (th.mm && th.mm.tapDrill) || null;
}
function unTap(th) {
  if (!th || th.system !== 'inch') return th && th.mm && th.mm.tapDrill;
  const t = tables()['UNTAP']; if (!t) return th.mm && th.mm.tapDrill;
  const want = (th.raw || '').replace(/-\d[AB]$/, '').replace(/\s+/g, ' ').trim();
  const row = Object.values(t.rows).find((r) => String(r.size || '').replace(/\s+/g, ' ') + ' ' + r.series === want || (r.size + ' ' + r.series).replace('#', '') === want.replace('#', ''));
  return (row && row.tapDrillMm) || (th.mm && th.mm.tapDrill) || null;
}
function parseFrom(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  let th = parseThread(s);
  if (th) return th;
  const inch = s.match(/((?:#\d{1,2}|\d+\/\d+|\.\d{3,4}|\d+\.\d{3,4}|\d+)\s*-\s*\d{2}\s*UN[CFJ]*)/i);
  if (inch) th = parseThread(inch[1]);
  if (th) return th;
  const met = s.match(/\b(MJ?)\s*(\d{1,2}(?:\.\d+)?)\s*[Xx\u00D7]\s*(\d(?:\.\d+)?)/i);
  if (met) th = parseThread(met[1].toUpperCase() + met[2] + 'x' + met[3]);
  if (th) return th;
  const coarse = s.match(/\bM\s*(\d{1,2}(?:\.\d+)?)\b/i);
  if (coarse) {
    const t = tables()['ISOM'];
    const hit = t && Object.keys(t.rows).find((k) => t.rows[k].coarse && k.toLowerCase() === ('m' + coarse[1] + 'x' + (t.rows[k].P)).toLowerCase() || (t.rows[k].coarse && t.rows[k].D === +coarse[1]));
    if (hit) return parseThread(hit.replace(/^M/i, 'M'));
  }
  return null;
}
function keensertDrill(th) {
  if (!th) return null;
  if (th.system === 'metric') return KEENSERT_METRIC[threadKey(th)] || KEENSERT_METRIC['M' + th.dia + 'x' + th.pitch] || null;
  const t = tables()['MS51830']; if (!t) return null;
  const key = threadKey(th).replace(/UNJC|UNJF/g, (x) => x.slice(0, 3)).replace(/-3B|-2A/g, '');
  for (const row of Object.values(t.rows)) {
    const inner = String(row.internal || '').toUpperCase();
    if (!inner) continue;
    if (inner.indexOf(String(th.raw || '').toUpperCase().replace(/-3B/, '')) >= 0 || inner.indexOf(key.toUpperCase()) >= 0) {
      const inn = parseFloat(row.tapDrill); if (inn > 0) return inn * 25.4;
    }
  }
  return null;
}
function helicoilDrill(th) {
  if (!th) return null;
  if (th.system === 'metric') return HELICOIL_METRIC[threadKey(th)] || HELICOIL_METRIC['M' + th.dia + 'x' + th.pitch] || null;
  const sti = stiRow((th.raw || '').replace(/-\d[AB]$/, '').replace(/UNJ[CF]?/, (s) => s.replace('J', '')).replace(/\s+/g, ' ').trim())
    || stiRow(th.dia && th.tpi ? `${th.raw.split(' ')[0]} ${th.series.replace('J', '')}` : '');
  if (sti && sti.dims && sti.dims.drillIn && sti.dims.drillIn.mm) return sti.dims.drillIn.mm;
  const t = tables()['HELICOILSTI'];
  if (t && th.tpi) {
    const k = Object.keys(t.rows).find((n) => n.replace(/UN[CF]/, '') === (String(th.raw || '').replace(/-\d[AB]$/, '').replace(/UNJ[CF]?/, '').trim()));
    if (k) { const inn = parseFloat(t.rows[k].drillIn); if (inn > 0) return inn * 25.4; }
  }
  return null;
}
function pinDia(text) {
  const s = String(text || '');
  const iso = s.match(/\bISO\s*(?:2338|8734)\b[^0-9]{0,12}(\d+(?:\.\d+)?)/i) || s.match(/(\d+(?:\.\d+)?)\s*[Xx\u00D7]\s*\d+(?:\.\d+)?/);
  const dia = s.match(/[\u00D8\u2300\u2205]\s*(\d+(?:\.\d+)?)/) || s.match(/\bDIA\.?\s*(\d+(?:\.\d+)?)/i);
  const n = parseFloat((dia && dia[1]) || (iso && iso[1]) || '');
  return n > 0 ? n : null;
}

/** { kind, d } or null. kind: tapDrill | insertDrill | pinFit. */
function suggestFor(it, unit) {
  if (!it || holeStated(it)) return null;
  const blob = blobOf(it);
  const th = parseFrom(blob);
  if (it.key === 'helicoil' || it.key === 'insert') {
    const mm = helicoilDrill(th) || isoTap(th) || unTap(th);
    const d = fmtDia(mm, unit); return d ? { kind: 'insertDrill', d } : null;
  }
  if (it.key === 'keensert') {
    const mm = keensertDrill(th) || helicoilDrill(th) || isoTap(th) || unTap(th);
    const d = fmtDia(mm, unit); return d ? { kind: 'insertDrill', d } : null;
  }
  if (it.key === 'unj' || it.key === 'mj' || it.key === 'thread-other' || it.key === 'thread' || it.key === 'screw') {
    const mm = isoTap(th) || unTap(th);
    const d = fmtDia(mm, unit); return d ? { kind: 'tapDrill', d } : null;
  }
  if (it.key === 'pin') {
    const n = pinDia(blob);
    if (!n) return { kind: 'pinFit', d: 'H7' };
    const d = unit === 'in' ? '\u00D8' + (Math.round((n > 5 ? n / 25.4 : n) * 10000) / 10000) : '\u00D8' + n + (/\bMM\b/i.test(blob) || n >= 1 ? ' mm' : '');
    return { kind: 'pinFit', d };
  }
  return null;
}
function applySuggestions(rows, unit) {
  if (!rows) return rows;
  for (const id of Object.keys(rows)) for (const it of rows[id].items || []) {
    const s = suggestFor(it, unit);
    if (s) it.suggest = s;
  }
  return rows;
}
function suggestLabel(s, tt) {
  if (!s || !s.kind) return '';
  const d = s.d || '';
  const body = (s.kind === 'pinFit' && d === 'H7') ? tt('ck.hole.pinFitBare') : tt('ck.hole.' + s.kind, { d });
  return body + ' (' + tt('ck.suggest') + ')';
}
module.exports = { holeStated, suggestFor, applySuggestions, suggestLabel, parseFrom, fmtDia };
