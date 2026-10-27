'use strict';
// requirements/rules: the friend's rule tables (rules.json, generated from notes_extractor.py) compiled to RegExp.
const R = require('./rules.json');

/** RegExp from a rules.json entry {src, i}; extra flags e.g. 'g'. Python's re.S is only used by LETTER. */
const rx = (name, extra = '') => { const e = R[name]; return new RegExp(e.src, (e.i ? 'i' : '') + (name === 'LETTER' ? 's' : '') + extra); };
/** [name, pattern] tables are always searched case-insensitively (re.search(rx, t, re.I)). */
const table = (name, f = 'i') => R[name].map(([n, src]) => [n, new RegExp(src, f)]);
const cache = {};
const get = (name, extra = '') => (cache[name + extra] ||= rx(name, extra));
module.exports = { R, rx: get, table, CATS: table('CATS', ''), HT_TYPES: table('HT_TYPES'), COAT_TYPES: table('COAT_TYPES'), PAINT_TYPES: table('PAINT_TYPES'), MASK_METHODS: table('MASK_METHODS'), MASK_AREAS: table('MASK_AREAS'), MASK_TARGET: table('MASK_TARGET') };
