// Local project storage (%APPDATA%\QR\projects\<id>\project.json plus index.json with tab order and active tab) and a quick RFQ key from e-mail files.
const fs = require('fs'); const path = require('path');
const ID = /^[a-z0-9-]{4,64}$/;
const dir = (base) => path.join(base, 'projects');
const okId = (id) => { if (!ID.test(String(id))) throw new Error('bad project id'); return id; };
function saveProject(base, id, data) { const d = path.join(dir(base), okId(id)); fs.mkdirSync(d, { recursive: true }); const f = path.join(d, 'project.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(data)); fs.renameSync(f + '.tmp', f); return true; }
function saveIndex(base, idx) { fs.mkdirSync(dir(base), { recursive: true }); const order = (idx.order || []).filter((x) => ID.test(x)); fs.writeFileSync(path.join(dir(base), 'index.json'), JSON.stringify({ order, active: ID.test(idx.active || '') ? idx.active : order[0] || null })); return true; }
/** Open projects in tab order (closed ones stay on disk but are not reopened). */
function listProjects(base) {
  let idx = { order: [], active: null }; try { idx = JSON.parse(fs.readFileSync(path.join(dir(base), 'index.json'), 'utf8')); } catch {}
  const projects = []; for (const id of idx.order || []) { try { if (ID.test(id)) projects.push({ id, data: JSON.parse(fs.readFileSync(path.join(dir(base), id, 'project.json'), 'utf8')) }); } catch { if (ID.test(id)) projects.push({ id, data: null }); } }
  return { order: projects.map((p) => p.id), active: idx.active || null, projects };
}
/** RFQ key of a subject: the 6-digit RFQ number, else the cleaned subject. */
const rfqKey = (subject) => { const s = String(subject || '').replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim(); return (s.match(/\b(\d{6})\b/) || [])[1] || s || null; };
/** Reads only the first e-mail of an Outlook import to find which RFQ it is (before the full run). */
async function peekRfq(paths, readMail) { for (const f of paths || []) if (/\.(msg|eml)$/i.test(f)) { try { const m = await readMail(f); const k = rfqKey(m && m.subject); if (k) return k; } catch {} } return null; }
/** Identity of the e-mail(s) of an Outlook import before the full run: { rfq: RFQ key of the first mail, keys: [mail key] }. */
async function peekMail(paths, readMail, keyOf) { const keys = []; let rfq = null; for (const f of paths || []) if (/\.(msg|eml)$/i.test(f)) { try { const m = await readMail(f); const k = keyOf(m); if (k) keys.push(k); rfq = rfq || rfqKey(m && m.subject); } catch {} } return { rfq, keys }; }
/** Copy files that still live under ImportCache / temp into the project folder and rewrite paths so History can reopen after the cache is freed. */
function adoptJobFiles(data, destDir, roots) {
  if (!data || !destDir) return data;
  const bases = (roots || []).filter(Boolean).map((r) => path.resolve(r));
  if (!bases.length) return data;
  fs.mkdirSync(destDir, { recursive: true });
  const map = new Map();
  const under = (p, root) => { const a = path.resolve(p); return a === root || a.startsWith(root + path.sep); };
  const skip = new Set(['raw', 'text', 'tokens', 'ocr', 'pages', 'words', 'evidence', 'message', 'html']);
  const isFile = (s) => {
    if (typeof s !== 'string' || s.length < 4) return false;
    if (!(/^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('/') || s.startsWith('\\\\'))) return false;
    try { return fs.existsSync(s) && fs.statSync(s).isFile(); } catch { return false; }
  };
  const destOf = (src) => {
    if (map.has(src)) return map.get(src);
    const ext = path.extname(src); const stem = path.basename(src, ext);
    let dest = path.join(destDir, path.basename(src)); let n = 1;
    while (fs.existsSync(dest)) { dest = path.join(destDir, stem + '-' + n + ext); n++; }
    fs.copyFileSync(src, dest); map.set(src, dest); return dest;
  };
  const walk = (v, key) => {
    if (typeof v === 'string') return isFile(v) && bases.some((r) => under(v, r)) ? destOf(v) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v)) o[k] = skip.has(k) ? v[k] : walk(v[k], k);
      return o;
    }
    return v;
  };
  return walk(data, '');
}

module.exports = { saveProject, saveIndex, listProjects, rfqKey, peekRfq, peekMail, adoptJobFiles };
