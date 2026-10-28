'use strict';
// QR button tokens: compact MRT toolbar look (light fill, thin border, 32px, 14px), px so text size cannot grow them.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'buttons.css'), 'utf8');
const MRT = { radius: '6px', 'border-w': '1px', h: '32px', 'pad-x': '12px', fs: '14px', fw: '500', 'fw-primary': '600', bg: '#ffffff', fg: '#1c1c1e', border: 'rgba(60, 60, 67, 0.55)', 'bg-hover': '#f2f2f7', 'primary-bg': '#ffffff', 'primary-fg': '#1c1c1e', 'primary-border': '#48484a', 'primary-bg-hover': '#f2f2f7', 'disabled-opacity': '1', 'disabled-bg': '#f5f5f7', 'disabled-fg': '#6b6b70' };
test('button tokens equal MRT', () => {
  for (const [k, v] of Object.entries(MRT)) assert.match(css, new RegExp(`--qr-btn-${k}:\\s*${v.replace(/[.()]/g, '\\$&')};`), k);
});
test('badges, chips and status use the button radius', () => assert.match(css, /\.qr-chip, \.qr-badge, \.qr-status[^{]*\{\s*border-radius: var\(--qr-btn-radius\)/));
