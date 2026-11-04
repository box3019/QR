'use strict';
// QR button tokens: compact MRT toolbar look (light fill, thin border, 32px, 14px), px so text size cannot grow them.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'buttons.css'), 'utf8');
const MRT = { radius: '6px', 'border-w': '1px', h: '32px', 'pad-x': '12px', fs: '14px', fw: '500', 'fw-primary': '600', bg: '#ffffff', fg: '#1c1c1e', border: 'rgba(60, 60, 67, 0.2)', 'bg-hover': '#f2f2f7', 'primary-h': '42px', 'primary-bg': '#87878c', 'primary-fg': '#ffffff', 'primary-border': '#757578', 'primary-bg-hover': '#9e9ea1', 'disabled-opacity': '1', 'disabled-bg': '#ffffff', 'disabled-fg': '#3a3a3c' };
test('button tokens equal MRT', () => {
  for (const [k, v] of Object.entries(MRT)) assert.match(css, new RegExp(`--qr-btn-${k}:\\s*${v.replace(/[.()]/g, '\\$&')};`), k);
});
test('badges, chips and status use the light 1px chip radius', () => assert.match(css, /\.qr-chip, \.qr-badge, \.qr-status[^{]*\{\s*border-radius: var\(--qr-card-r, var\(--qr-btn-radius\)\)/));
test('light buttons float like the summary counters', () => {
  assert.match(css, /--qr-float-lift:\s*var\(--mrt-press-lift/);
  assert.match(css, /--qr-float-shadow:\s*var\(--qr-card-shadow/);
  assert.match(css, /transform: var\(--qr-float-lift\)/);
});
