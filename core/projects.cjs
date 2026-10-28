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
module.exports = { saveProject, saveIndex, listProjects, rfqKey, peekRfq, peekMail };
