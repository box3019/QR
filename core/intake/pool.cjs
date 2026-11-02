'use strict';
// Bounded parallel map for per-part extract/analyse. Keeps a small cap so PDF/OCR WASM stays stable.
const os = require('os');
const DEFAULT_CONCURRENCY = Math.max(1, Math.min(4, (os.cpus() || []).length || 2));

async function mapLimit(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const ret = new Array(list.length);
  let next = 0;
  const n = Math.max(1, Math.min(Math.max(1, limit || DEFAULT_CONCURRENCY), Math.max(1, list.length)));
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= list.length) return;
      ret[i] = await fn(list[i], i);
    }
  }
  if (!list.length) return ret;
  await Promise.all(Array.from({ length: n }, worker));
  return ret;
}

module.exports = { mapLimit, DEFAULT_CONCURRENCY };
