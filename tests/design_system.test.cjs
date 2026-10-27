'use strict';
// QR design system: MRT tokens (Priority ERP), colour only for status, identical groups, one light tag, no pills.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const pal = R('src/styles/qrPalette.css'), doc = R('docs/design-tokens.md'), sys = R('src/styles/system.css');

test('palette = MRT Priority ERP values, all documented in docs/design-tokens.md', () => {
  for (const hex of ['#b8bcc4', '#f4f5f7', '#eceef2', '#dfe3ea', '#0a1628', '#334155', '#2f855a', '#ca8a04', '#c53030']) { assert.ok(pal.includes(hex), hex); assert.ok(doc.includes(hex), 'doc ' + hex); }
  assert.doesNotMatch(pal, /#b8c0cc|#1e293b/, 'old Industrial Steel values are gone');
});
test('status colours are the only colours: system.css uses tokens, no raw tinted fills', () => {
  const hex = sys.match(/#[0-9a-fA-F]{3,6}\b/g) || []; assert.ok(hex.every((h) => /^#fff(fff)?$/i.test(h)), 'only white allowed raw: ' + hex);
  for (const f of ['src/styles/groups.css', 'src/styles/system.css']) assert.doesNotMatch(R(f), /--pg-accent|--pg-bg|border-inline-start: 4px/, f);
});
test('no pills, no dark fills in the new design layer', () => { assert.doesNotMatch(sys, /border-radius:\s*(50%|999|9999)/); assert.doesNotMatch(R('src/styles/wizard.css'), /border-radius: 1\.125rem/);
  assert.match(sys, /\.qr-dot \{[^}]*width: 8px; height: 8px; border-radius: 2px/); });
test('one light tag for chip and status: neutral white fill, border, dot carries colour', () => {
  assert.match(sys, /\.qr-root \.qr-status, \.qr-root \.qr-chip \{[^}]*background: #fff/); assert.doesNotMatch(R('src/styles/qr.css'), /\.qr-status\[data-tone='ready'\] \{ background/);
  const s = R('src/ui/simple.tsx'); assert.match(s, /className="qr-status qr-tag"/); assert.match(s, /qr-dot/);
});
test('list: identical group headers (name + count + dot), rows = PN + rev + one tag; no reason or material lines', () => {
  const g = R('src/parts/PartGroup.tsx'), p = R('src/views/Parts.tsx');
  assert.match(g, /qr-dot[\s\S]*qr-pgroup-name[\s\S]*qr-pgroup-n/); assert.doesNotMatch(g, /data-tone|--pg-/);
  assert.doesNotMatch(p, /qr-reject|parts\.noMaterial|rejectReason/); assert.match(p, /<PlainStatusBadge part=\{p\} \/>/);
  assert.match(sys, /\.qr-part\[data-active='true'\] \{[^}]*border-color: var\(--mrt-accent\)/); assert.doesNotMatch(R('src/styles/qr.css'), /\.qr-part\[data-active/);
});
test('tiles on Check parts and Documents & questions (both use PartsPanel), tiles are not buttons', () => {
  assert.match(R('src/views/Parts.tsx'), /<Tiles /); assert.match(R('src/components/wizard/StepCheckParts.tsx'), /PartsPanel/); assert.match(R('src/components/wizard/StepDocsQuestions.tsx'), /PartsPanel/);
  const t = R('src/ui/Tiles.tsx'); assert.doesNotMatch(t, /<button/); assert.match(sys, /\.qr-tile \{[^}]*background: var\(--mrt-surface\)/);
  assert.match(R('src/views/Parts.tsx'), /tile\.allGood/);
});
test('docs: tokens file covers palette, status, type, geometry, Priority ERP and CleanMyMac notes', () => {
  for (const w of ['Status palette', 'Typography', 'Geometry', 'Priority ERP', 'CleanMyMac', 'radius', 'tiles are not buttons']) assert.ok(doc.includes(w), w); });
