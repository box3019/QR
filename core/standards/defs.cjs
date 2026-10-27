'use strict';
// Standards library definitions (data, not code). New standards are added here as entries + a data file.
// kind: port | oring | insert-key | insert-coil | thread. paid: never downloaded; the user uploads a licensed copy once.
const path = require('path');
const AS5202 = require('./data/as5202.json');
const DEFS = [
  { id: 'AS5202', kind: 'port', paid: true, aliases: ['AS-5202', 'AS 5202'], equivalent: ['MS33649'], table: AS5202, kit: 'fitting',
    title: 'Port, internal straight thread, boss / fluid connection', fittings: 'AS4875',
    notes: { en: ['Equivalent to MS33649.', 'The port is for AS4875 fittings.', 'B is the full-thread depth for a blind tap.', 'G may be reduced by .040 for a raised surface.', 'N is perpendicularity to the threads at G min.'],
      he: ['שווה ערך ל־MS33649.', 'הפתח מיועד למחברים לפי AS4875.', 'B הוא עומק ההברגה המלאה בהברגה עיוורת.', 'מותר להקטין את G ב־.040 למשטח מוגבה.', 'N הוא ניצבות להברגה ב־G מינימלי.'] } },
  { id: 'MS33649', kind: 'port', paid: false, aliases: ['MS 33649'], sameAs: 'AS5202', kit: 'fitting', title: 'Boss, fluid connection, internal straight thread' },
  { id: 'AS568', kind: 'oring', paid: true, aliases: ['AS568A', 'AS568B', 'AS568C', 'AS568D', 'AS-568'], kit: 'oring', title: 'Aerospace size standard for O-rings' },
  { id: 'M83248/1', kind: 'oring', paid: false, aliases: ['MIL-DTL-83248/1', 'M83248-1'], sizesFrom: 'AS568', kit: 'oring', title: 'O-ring, fluorocarbon (FKM), high temperature' },
  { id: 'M83248/2', kind: 'oring', paid: false, aliases: ['MIL-DTL-83248/2'], sizesFrom: 'AS568', kit: 'oring', title: 'O-ring, fluorocarbon (FKM), compression set resistant' },
  { id: 'NASM33537', kind: 'insert-key', paid: true, aliases: ['NASM 33537'], kit: 'insert', title: 'Insert, screw thread, key-locked (Keensert)' },
  { id: 'MS51830', kind: 'insert-key', paid: false, aliases: ['MS 51830'], kit: 'insert', title: 'Insert, screw thread, locked-in, key-locked (Keensert)' },
  { id: 'NASM21209', kind: 'insert-coil', paid: true, aliases: ['NASM 21209'], kit: 'insert', title: 'Insert, screw thread, helical coil, self-locking (Helicoil)' },
  { id: 'MS21209', kind: 'insert-coil', paid: false, aliases: ['MS 21209'], kit: 'insert', title: 'Insert, screw thread, helical coil (Helicoil)' },
];
const byId = new Map(DEFS.map((d) => [d.id, d]));
const norm = (s) => String(s || '').toUpperCase().replace(/[\s-]+/g, '').replace(/^SAE/, '');
function defOf(id) { const n = norm(id); return DEFS.find((d) => norm(d.id) === n || (d.aliases || []).some((a) => norm(a) === n)) || null; }
/** Table def used for rows (MS33649 uses the AS5202 rows). */
const tableDef = (d) => (d && d.sameAs ? byId.get(d.sameAs) : d);
const isPaid = (id) => { const d = defOf(id); if (d) return d.paid; return /^(SAE|AS\d|AMS|NAS(M)?\d|ARP|ISO|DIN|ASME|ASTM)/i.test(norm(id)); };
module.exports = { DEFS, defOf, tableDef, isPaid, norm, dataDir: path.join(__dirname, 'data') };
