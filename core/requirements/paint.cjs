'use strict';
// requirements/paint: paint / primer / powder types named in a text.
const { PAINT_TYPES } = require('./rules.cjs');
const paintTypes = (tt) => PAINT_TYPES.filter(([, re]) => re.test(tt)).map(([n]) => n);
module.exports = { paintTypes };
