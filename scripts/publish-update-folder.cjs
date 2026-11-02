'use strict';
// Copy the current NSIS installer and source zip into the update feed folder, archive older
// artefacts into _Archive, then write qr-release.json LAST and verify size + SHA-256.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST = 'qr-release.json';
const ARCHIVE = '_Archive';

function sha256File(file, io) {
  const fsio = io || fs;
  const hash = crypto.createHash('sha256');
  hash.update(fsio.readFileSync(file));
  return hash.digest('hex');
}

function listFeedFiles(feed, io) {
  const fsio = io || fs;
  let names = [];
  try { names = fsio.readdirSync(feed); } catch { names = []; }
  return names.filter((n) => n !== ARCHIVE && n !== MANIFEST && /^QR_v.*\.(exe|zip)$/i.test(n)); // only QR installers and source zips are archived: README.txt and anything else stays in place
}

function archiveOlder(feed, keep, io) {
  const fsio = io || fs;
  const dest = path.join(feed, ARCHIVE);
  fsio.mkdirSync(dest, { recursive: true });
  const keepBase = new Set((keep || []).map((p) => path.basename(p)));
  const moved = [];
  for (const n of listFeedFiles(feed, fsio)) {
    if (keepBase.has(n)) continue;
    const from = path.join(feed, n);
    let st; try { st = fsio.statSync(from); } catch { continue; }
    if (!st.isFile()) continue;
    fsio.renameSync(from, path.join(dest, n));
    moved.push(n);
  }
  return moved;
}

function publishUpdateFolder(opts, io) {
  const fsio = io || fs;
  const ops = [];
  const feed = path.resolve(String(opts.feed || '').trim());
  const installer = path.resolve(String(opts.installer || '').trim());
  const zip = opts.zip ? path.resolve(String(opts.zip).trim()) : '';
  const version = String(opts.version || '').trim().replace(/^v/i, '');
  const notes = Array.isArray(opts.releaseNotes) ? opts.releaseNotes : [];
  if (!feed) throw new Error('feed folder is required');
  if (!installer) throw new Error('installer is required');
  if (!version) throw new Error('version is required');
  if (!fsio.existsSync(installer)) throw new Error('installer not found: ' + installer);
  if (zip && !fsio.existsSync(zip)) throw new Error('source zip not found: ' + zip);
  fsio.mkdirSync(feed, { recursive: true });
  ops.push('mkdir-feed');
  const instName = path.basename(installer);
  const zipName = zip ? path.basename(zip) : '';
  const keep = [instName, zipName].filter(Boolean);
  const archived = archiveOlder(feed, keep, fsio);
  if (archived.length) ops.push('archive');
  const instDest = path.join(feed, instName);
  fsio.copyFileSync(installer, instDest);
  ops.push('copy-installer');
  if (zip) { fsio.copyFileSync(zip, path.join(feed, zipName)); ops.push('copy-zip'); }
  const st = fsio.statSync(instDest);
  const sha = sha256File(instDest, fsio);
  const manifest = {
    latestVersion: version,
    installerFile: instName,
    installerSizeBytes: st.size,
    installerSha256: sha,
    releaseNotes: notes,
    mandatory: opts.mandatory === true,
    minimumSupportedVersion: String(opts.minimumSupportedVersion || '').trim(),
    releaseDate: opts.releaseDate || new Date().toISOString().slice(0, 10),
  };
  const manPath = path.join(feed, MANIFEST);
  fsio.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  ops.push('write-manifest');
  const back = JSON.parse(fsio.readFileSync(manPath, 'utf8'));
  if (back.latestVersion !== version) throw new Error('verify failed: version');
  if (back.installerFile !== instName) throw new Error('verify failed: installer file');
  if (Number(back.installerSizeBytes) !== st.size) throw new Error('verify failed: size');
  if (String(back.installerSha256).toLowerCase() !== sha) throw new Error('verify failed: checksum');
  if (!fsio.existsSync(instDest)) throw new Error('verify failed: installer missing');
  ops.push('verify');
  return { feed, manifest, archived, ops, installer: instDest };
}

function findDefaultInstaller(releaseDir, version, io) {
  const fsio = io || fs;
  const name = `QR_v${version}_Setup.exe`;
  const p = path.join(releaseDir, name);
  if (fsio.existsSync(p)) return p;
  if (!fsio.existsSync(releaseDir)) return '';
  const hits = fsio.readdirSync(releaseDir).filter((n) => /^QR_v.*_Setup\.exe$/i.test(n));
  return hits.length ? path.join(releaseDir, hits.sort().pop()) : '';
}

function main(argv, io) {
  const args = argv || process.argv.slice(2);
  const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse((io || fs).readFileSync(path.join(root, 'package.json'), 'utf8'));
  const version = get('version', pkg.version);
  const feed = get('feed', process.env.QR_UPDATE_FEED || '');
  const installer = get('installer', findDefaultInstaller(path.join(root, 'release'), version, io));
  const zip = get('zip', '');
  const notes = get('notes', '');
  if (!feed) throw new Error('pass --feed <folder> (or QR_UPDATE_FEED)');
  if (!installer) throw new Error('pass --installer <file> (or build with dist:win first)');
  const r = publishUpdateFolder({
    feed, installer, zip, version,
    releaseNotes: notes ? notes.split('|').map((s) => s.trim()).filter(Boolean) : [],
    mandatory: args.includes('--mandatory'),
    minimumSupportedVersion: get('min', ''),
  }, io);
  return r;
}

if (require.main === module) {
  try {
    const r = main();
    process.stdout.write('published ' + r.manifest.latestVersion + ' -> ' + r.feed + '\n');
  } catch (e) {
    process.stderr.write(String((e && e.message) || e) + '\n');
    process.exit(1);
  }
}

module.exports = { publishUpdateFolder, archiveOlder, sha256File, findDefaultInstaller, main, MANIFEST, ARCHIVE };
