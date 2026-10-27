'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { detectPartNo } = require('../core/analyze.cjs');

test('ELTA rev from file name when the drawing text has none (1096b020-001b.pdf)', () => {
  assert.strictEqual(detectPartNo('ELTA 1096B020-001', 'ELTA', '1096b020-001b.pdf').rev, 'B');
  assert.strictEqual(detectPartNo('ELTA 1096B020-001', 'ELTA', '1096B020-001B_Balloons.pdf').rev, 'B');
  assert.strictEqual(detectPartNo('ELTA 1096B020-001', 'ELTA', '1.pdf').rev, null);
});
