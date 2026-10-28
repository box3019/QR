// Synthetic demo drawings (no customer data) shared by the shot / layout-check scripts.
const at = (x, y, t) => `<div style="position:absolute;left:${x}px;top:${y}px;white-space:nowrap">${t}</div>`;
const sheet = (pn, labels, body) => `<html><body style="margin:0;font:13px Arial"><div style="position:relative;width:1100px;height:770px">
  <div style="position:absolute;left:30px;top:30px;width:1060px;height:730px;border:2px solid #000"></div>
  ${labels ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => at(30 + (i - 1) * 132 + 60, 8, i) + at(30 + (i - 1) * 132 + 60, 764, i)).join('') + ['A', 'B', 'C', 'D'].map((c, i) => at(10, 30 + i * 182 + 80, c) + at(1094, 30 + i * 182 + 80, c)).join('') : ''}
  ${at(60, 50, '<b style="font-size:20px">PART NO ' + pn + '  REV A</b>')}${at(60, 80, 'TITLE: DEMO HOUSING ' + pn + ' &nbsp; ALL DIMENSIONS IN MILLIMETERS')}${body}</div></body></html>`;
const notes = (x, y, items) => at(x, y, '<b>NOTES:</b>') + items.map((t, i) => at(x, y + 22 + i * 20, `${i + 1}. ${t}`)).join('');
const DOCS = [
  { pn: '9800-0001', labels: true, html: (pn) => sheet(pn, true,
    notes(60, 120, ['MATERIAL: DELRIN (POM) ROD', 'ENGRAVE PART NO, 0.2 DEEP, FILL WITH WHITE PAINT', 'INSTALL 4X KEENSERT M5X0.8 IN HOLES MARKED K', 'PAINT PER MIL-PRF-85285 COLOR BLACK, PRIMER BR127', '100% INSPECTION REQUIRED', 'CLEAN ROOM CLEANING AFTER FINAL MACHINING', 'THREADS UNJ 1/4-28 UNJF-3B', 'PIN DOWEL 3 X 8 ISO 2338, 2X']) +
    at(700, 200, 'Ø10 H7 THRU') + at(300, 420, 'Ø6 +0.010/-0.000 THRU HOLE') + at(820, 520, 'FLATNESS 0.005 A') + at(500, 640, 'Ra 0.4') + at(140, 600, 'Ø12 g6')) },
  { pn: '9800-0002', labels: false, html: (pn) => sheet(pn, false,
    notes(60, 120, ['MATERIAL: ALUMINUM 6061-T6 BAR', 'HEAT TREAT PER AMS 2770 T6', 'CHEM FILM PER MIL-DTL-5541 CLASS 3', 'LASER MARK PART NO ON FACE', 'NO PAINT']) + at(800, 300, 'Ø8 H6 THRU') + at(300, 500, '25.000 ±0.005')) },
  { pn: '9800-0003', labels: false, html: (pn) => sheet(pn, false, notes(60, 120, ['MATERIAL: ALUMINUM 6061-T6 BAR', 'BREAK ALL SHARP EDGES']) + at(600, 400, '40.0 ±0.2')) },
];
module.exports = { DOCS };
