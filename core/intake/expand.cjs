'use strict';
// intake/expand: turn dropped paths (files, folders, archives, emails) into a flat file list plus RFQ records.
const fs = require('fs');
const path = require('path');
const { fileKind } = require('./classify.cjs');
const { extractArchive } = require('./archive.cjs');

let n = 0;
const sub = (tmp, name) => path.join(tmp, `${path.basename(name).replace(/[^\w.\- ]/g, '_')}_${Date.now()}_${n++}`);

/**
 * @param {string[]} paths
 * @param {string} tmp working folder
 * @param {{ sevenZip?: string, readEmail?: Function, onStatus?: Function, onError?: Function }} opts
 * @returns {Promise<{ files: string[], rfqs: object[] }>}
 */
async function expand(paths, tmp, opts = {}, depth = 0) {
  const files = []; const rfqs = [];
  const status = opts.onStatus || (() => {}); const fail = opts.onError || ((f, e) => { throw e; });
  for (const p of paths) {
    let st; try { st = fs.statSync(p); } catch (e) { fail(p, e); continue; }
    if (st.isDirectory()) { const r = await expand(fs.readdirSync(p).map((x) => path.join(p, x)), tmp, opts, depth); files.push(...r.files); rfqs.push(...r.rfqs); continue; }
    const kind = fileKind(p);
    if (kind === 'archive' && depth < 5) {
      try { status(`Unpacking ${path.basename(p)}`); const r = await expand(await extractArchive(p, sub(tmp, p), opts), tmp, opts, depth + 1); files.push(...r.files); rfqs.push(...r.rfqs); }
      catch (e) { fail(p, e); }
    } else if (kind === 'email' && opts.readEmail && depth < 5) {
      try {
        status(`Reading email ${path.basename(p)}`);
        const { rfq, attachmentFiles } = await opts.readEmail(p, sub(tmp, p));
        rfqs.push(rfq);
        const r = await expand(attachmentFiles, tmp, opts, depth + 1); files.push(...r.files); rfqs.push(...r.rfqs);
      } catch (e) { fail(p, e); }
    } else files.push(p);
  }
  return { files, rfqs };
}
module.exports = { expand };
