'use strict';
// Customer specs and certificates never belong to the quote stage; the summary header and the tiles share one status source; the canvas stays lighter than grey.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..'); const imp = (...p) => import(pathToFileURL(path.join(root, ...p)).href);
const ST = require('../core/docs/stage.cjs');

test('customer-internal spec ids are route-card, public standards stay now', () => {
  for (const id of ['GEN_1111-1', 'PS-111.21', 'RAFDOCS-434847', 'GS-4P05002', 'XYZ-77 (customer)']) assert.ok(ST.isCustomerSpecId(id, 'spec'), id);
  for (const id of ['ASTM B227', 'AMS-C-26074', 'MIL-A-8625', 'AMS2700', 'ASTM B700']) assert.ok(!ST.isCustomerSpecId(id, 'spec'), id);
  assert.ok(!ST.isCustomerSpecId('AS5202', 'port'));
});
test('library standards tasks of customer specs are staged route card (std:true, even when found in the library), others stay now', () => {
  const part = { refs: [], route: [], notes: [], tasks: [
    { type: 'uploadDocument', std: true, refNumber: 'GEN_1111-1', status: 'open' }, { type: 'uploadDocument', std: true, refNumber: 'PS-111.29', status: 'open' },
    { type: 'uploadDocument', std: true, refNumber: 'RAFDOCS-434847', status: 'open' }, { type: 'uploadDocument', std: true, refNumber: 'ASTM B227', status: 'open' }] };
  ST.upgradePart(part);
  assert.deepStrictEqual(part.tasks.map((t) => t.stage), ['routecard', 'routecard', 'routecard', 'now']);
  assert.deepStrictEqual(part.tasks.filter(ST.isOpenNowTask).map((t) => t.refNumber), ['ASTM B227']);
});
test('route card lists customer specs that the standards step found (even in the library)', () => {
  const rc = ST.buildRouteCard({ route: [], refs: [], notes: [], customer: 'ACME', standards: [{ std: 'GEN_1111-1', kind: 'spec', status: 'resolved', doc: { key: 'k' }, title: '' }, { std: 'ASTM B227', kind: 'spec', status: 'needsDoc' }] });
  assert.deepStrictEqual(rc.groups.flatMap((g) => g.items).map((i) => i.number), ['GEN_1111-1']);
});
test('summary header and tiles come from one source (a part that is OK is never flagged)', async () => {
  const s = await imp('src', 'wizard', 'summary.mjs'); const g = await imp('src', 'parts', 'groups.mjs');
  const mk = (o) => ({ problems: [], tasks: [], ...o });
  const parts = [mk({ problems: [{ severity: 'Warning', status: 'open' }] }), mk({ tasks: [{ type: 'uploadDocument', status: 'open', stage: 'routecard' }] }),
    mk({ tasks: [{ type: 'uploadDocument', status: 'open', stage: 'now' }] }), mk({ problems: [{ severity: 'Question', status: 'open' }] }), mk({ status: 'rejected' })];
  const c = g.tileCounts(parts); const flagged = s.summaryCounts(parts).flagged;
  assert.strictEqual(flagged.length, parts.length - c.ready); assert.strictEqual(c.ready, 2); assert.deepStrictEqual(flagged, [2, 3, 4]);
});
test('every palette: white cards read as layered on the canvas (canvas not mid-grey, enough lightness gap)', () => {
  const css = fs.readFileSync(path.join(root, 'src', 'styles', 'themes.css'), 'utf8');
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
  let n = 0;
  for (const m of css.matchAll(/data-qr-palette='([\w-]+)'\]\s*\{([^}]*)\}/g)) {
    const bg = /--mrt-bg:\s*(#[0-9a-f]{6})/i.exec(m[2]), sf = /--mrt-surface:\s*(#[0-9a-f]{6})/i.exec(m[2]); if (!bg || !sf) continue; n++;
    assert.ok(L(bg[1]) >= 84, m[1] + ' canvas too dark (L*=' + L(bg[1]).toFixed(1) + ')'); assert.ok(L(sf[1]) - L(bg[1]) >= 4.5, m[1] + ' card not distinct from canvas');
  }
  assert.ok(n >= 10, 'checked ' + n + ' light palettes');
});
