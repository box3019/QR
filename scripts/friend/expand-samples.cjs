// Unpacks sample inputs (PDF / ZIP / RAR / MSG) to one folder of PDFs, so both the Python original and the port read the same files.
// Usage: node scripts/friend/expand-samples.cjs <outDir> <input...>
const fs = require('fs'); const path = require('path');
const { expand } = require('../../core/intake/expand.cjs');
const { readEmail } = require('../../core/email/index.cjs');
const sevenZip = path.join(__dirname, '..', '..', 'vendor', '7zip', '7z.exe');
(async () => {
  const [out, ...inputs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const tmp = path.join(out, '_tmp'); fs.mkdirSync(tmp, { recursive: true });
  const { files } = await expand(inputs, tmp, { sevenZip, readEmail: (f, o) => readEmail(f, o, {}) });
  const list = files.filter((f) => /\.pdf$/i.test(f));
  for (const f of list) fs.copyFileSync(f, path.join(out, path.basename(f)));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(list.length, 'pdfs');
})().catch((e) => { console.error(e); process.exit(1); });
