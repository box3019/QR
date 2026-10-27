'use strict';
// Controls that used to grow with the text-size setting are capped in px.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
test('size caps in px for stepper, avatar, group headers, tabs', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'caps.css'), 'utf8');
  for (const sel of ['.mrt-wizard-step', '.qr-ai-avatar', '.qr-pgroup-h', '.qr-tab']) {
    const m = css.match(new RegExp(sel.replace('.', '\\.') + '\\s*\\{([^}]*)\\}')); assert.ok(m, sel);
    assert.match(m[1], /max-height:\s*\d+px/, sel); assert.match(m[1], /font-size:\s*14px/, sel); assert.doesNotMatch(m[1], /\d(r?em|%)/, sel);
  }
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'main.tsx'), 'utf8'), /caps\.css/);
});
