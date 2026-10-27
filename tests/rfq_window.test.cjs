const test = require('node:test'); const assert = require('node:assert');
const { attachRfqs } = require('../core/rfq/attach.cjs');
const { clampBounds } = require('../electron/window.cjs');
test('quantities attach by part number', () => {
  const parts = [{ partNo: 'BG06332A' }, { partNo: 'Q1' }];
  const [r] = attachRfqs(parts, [{ rfq_no: '1', rows: [{ part_no: 'BG06332A', qty: 3717, uom: 'EA' }, { part_no: 'L67639A', qty: 1 }] }]);
  assert.equal(parts[0].rfq.qty, 3717); assert.deepEqual(r.match.rows_without_drawing, ['L67639A']); assert.deepEqual(r.match.parts_without_row, ['Q1']);
});
test('window bounds clamp into the work area (150% scaling: 1280x688 DIP)', () => {
  const wa = { x: 0, y: 0, width: 1280, height: 688 };
  assert.deepEqual(clampBounds({ x: -50, y: 300, width: 1600, height: 980 }, wa), { x: 0, y: 0, width: 1280, height: 688 });
  assert.deepEqual(clampBounds({ x: 1200, y: 10, width: 800, height: 500 }, wa), { x: 480, y: 10, width: 800, height: 500 });
  assert.deepEqual(clampBounds(null, { x: 1920, y: 0, width: 1536, height: 824 }), { x: 1920, y: 0, width: 1536, height: 824 });
});
