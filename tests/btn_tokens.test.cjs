'use strict';
// QR button tokens must stay equal to the MRT values measured by scripts/btn-probe (industrial-steel, light).
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'buttons.css'), 'utf8');
const MRT = { radius: '8px', 'border-w': '1px', h: '2.5rem', 'pad-x': '0.85rem', fs: '0.875rem', fw: '500', 'fw-primary': '600', bg: '#e8ecf1', fg: '#0f172a', border: '#334155', 'bg-hover': '#dce1e8', 'primary-bg': '#6a6e77', 'primary-fg': '#ffffff', 'primary-border': '#62656d', 'primary-bg-hover': '#777b85', 'disabled-opacity': '0.48' };
test('button tokens equal MRT', () => {
  for (const [k, v] of Object.entries(MRT)) assert.match(css, new RegExp(`--qr-btn-${k}:\\s*${v.replace('.', '\\.')};`), k);
});
test('badges, chips and status use the button radius', () => assert.match(css, /\.qr-chip, \.qr-badge, \.qr-status[^{]*\{\s*border-radius: var\(--qr-btn-radius\)/));
