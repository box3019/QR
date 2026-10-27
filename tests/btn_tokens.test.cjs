'use strict';
// QR button tokens: compact MRT toolbar look (light fill, thin border, 32px, 14px), px so text size cannot grow them.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'buttons.css'), 'utf8');
const MRT = { radius: '6px', 'border-w': '1px', h: '32px', 'pad-x': '12px', fs: '14px', fw: '500', 'fw-primary': '600', bg: '#f8fafc', fg: '#0f172a', border: '#cbd5e1', 'bg-hover': '#eef2f6', 'primary-bg': '#f8fafc', 'primary-fg': '#1d4ed8', 'primary-border': '#2563eb', 'primary-bg-hover': '#eff6ff', 'disabled-opacity': '0.48' };
test('button tokens equal MRT', () => {
  for (const [k, v] of Object.entries(MRT)) assert.match(css, new RegExp(`--qr-btn-${k}:\\s*${v.replace('.', '\\.')};`), k);
});
test('badges, chips and status use the button radius', () => assert.match(css, /\.qr-chip, \.qr-badge, \.qr-status[^{]*\{\s*border-radius: var\(--qr-btn-radius\)/));
