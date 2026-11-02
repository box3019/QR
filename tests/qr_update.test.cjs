'use strict';
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path'); const os = require('os'); const crypto = require('crypto');
const U = require('../electron/qrUpdate.cjs');
const { publishUpdateFolder } = require('../scripts/publish-update-folder.cjs');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');

test('compareSemver: newer / same / older', () => {
  assert.strictEqual(U.compareSemver('0.1.8', '0.1.7'), 1);
  assert.strictEqual(U.compareSemver('0.1.7', '0.1.7'), 0);
  assert.strictEqual(U.compareSemver('0.1.6', '0.1.7'), -1);
  assert.strictEqual(U.compareSemver('v0.2.0', '0.1.9'), 1);
  assert.strictEqual(U.compareSemver('bad', '0.1.0'), null);
});

test('manifest validation requires version, installer name, size and checksum', () => {
  const good = { latestVersion: '0.1.8', installerFile: 'QR_v0.1.8_Setup.exe', installerSizeBytes: 12, installerSha256: 'a'.repeat(64), releaseNotes: ['n'], mandatory: false };
  assert.ok(U.validateManifest(good).ok);
  assert.ok(!U.validateManifest({ ...good, installerSha256: 'zz' }).ok);
  assert.ok(!U.validateManifest({ ...good, installerSizeBytes: 0 }).ok);
  assert.ok(!U.validateManifest({ ...good, installerFile: '..\\evil.exe' }).ok);
  assert.ok(!U.validateManifest({ ...good, latestVersion: 'x' }).ok);
});

test('decideUpdate blocks same version and downgrade', () => {
  const m = U.validateManifest({ latestVersion: '0.1.7', installerFile: 'QR_v0.1.7_Setup.exe', installerSizeBytes: 1, installerSha256: 'b'.repeat(64) }).manifest;
  assert.strictEqual(U.decideUpdate('0.1.7', m).reason, 'same');
  assert.strictEqual(U.decideUpdate('0.1.8', m).reason, 'downgrade');
  const n = { ...m, latestVersion: '0.1.9', minimumSupportedVersion: '0.1.8' };
  const d = U.decideUpdate('0.1.7', n);
  assert.strictEqual(d.reason, 'available'); assert.strictEqual(d.update.mandatory, true);
});

test('sha256 verify of a copied installer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-upd-'));
  const f = path.join(dir, 'a.exe');
  const buf = Buffer.from('installer-bytes-for-qr');
  fs.writeFileSync(f, buf);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  assert.strictEqual(U.sha256File(f), sha);
  assert.ok(U.verifyInstaller(f, buf.length, sha).ok);
  assert.ok(!U.verifyInstaller(f, buf.length + 1, sha).ok);
  assert.ok(!U.verifyInstaller(f, buf.length, 'c'.repeat(64)).ok);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('install copies in 1 MB chunks, verifies, spawns without /S, never mentions Outlook', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-upd-'));
  const feed = path.join(dir, 'feed'); const local = path.join(dir, 'Local');
  fs.mkdirSync(feed); fs.mkdirSync(local);
  const payload = Buffer.alloc(1024 * 1024 + 80, 7);
  const installer = path.join(feed, 'QR_v0.1.8_Setup.exe');
  fs.writeFileSync(installer, payload);
  const sha = crypto.createHash('sha256').update(payload).digest('hex');
  fs.writeFileSync(path.join(feed, 'qr-release.json'), JSON.stringify({
    latestVersion: '0.1.8', installerFile: 'QR_v0.1.8_Setup.exe', installerSizeBytes: payload.length, installerSha256: sha, releaseNotes: ['fix print'],
  }));
  const spawned = []; let quit = 0;
  const host = U.createUpdateHost({
    app: { getVersion: () => '0.1.7', quit: () => { quit++; } },
    shell: { openPath: async () => '' },
    getSettings: () => ({ updateFeedFolder: feed }),
    getWin: () => null,
    env: { LOCALAPPDATA: local },
    spawnFn: (exe, args, opts) => { spawned.push({ exe, args, opts }); return { unref() {} }; },
    quitAfterMs: 10,
  });
  const chk = await host.handle('check', {});
  assert.ok(chk.update); assert.strictEqual(chk.update.latestVersion, '0.1.8');
  const same = U.decideUpdate('0.1.8', chk.update); assert.strictEqual(same.reason, 'same');
  const inst = await host.handle('install-update', {});
  assert.ok(inst.ok); assert.strictEqual(spawned.length, 1);
  assert.deepStrictEqual(spawned[0].args, []);
  assert.ok(!/\/S/.test(JSON.stringify(spawned)));
  assert.ok(spawned[0].opts.detached);
  const cached = path.join(local, 'QR', 'UpdateCache', 'QR_v0.1.8_Setup.exe');
  assert.ok(fs.existsSync(cached));
  assert.strictEqual(U.sha256File(cached), sha);
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(quit >= 1);
  const log = fs.readFileSync(path.join(local, 'QR', 'Logs', 'update.log'), 'utf8');
  assert.ok(/spawn installer/.test(log));
  assert.doesNotMatch(src('electron/qrUpdate.cjs'), /outlook\.exe|taskkill|taskkill/i);
  assert.doesNotMatch(src('electron/qrUpdate.cjs'), /spawn\([^)]*outlook/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('publish writes qr-release.json last, archives older files, then verifies', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-pub-'));
  const feed = path.join(dir, 'feed'); const release = path.join(dir, 'rel');
  fs.mkdirSync(feed); fs.mkdirSync(release);
  fs.writeFileSync(path.join(feed, 'QR_v0.1.6_Setup.exe'), 'old');
  fs.writeFileSync(path.join(feed, 'QR_v0.1.6_source.zip'), 'oldz');
  const inst = path.join(release, 'QR_v0.1.8_Setup.exe'); const zip = path.join(release, 'QR_v0.1.8_source.zip');
  fs.writeFileSync(inst, 'new-installer'); fs.writeFileSync(zip, 'new-zip');
  const ops = [];
  const wrap = {
    ...fs,
    copyFileSync(...a) { ops.push('copy:' + path.basename(a[1])); return fs.copyFileSync(...a); },
    renameSync(...a) { ops.push('archive:' + path.basename(a[0])); return fs.renameSync(...a); },
    writeFileSync(p, data, enc) { ops.push('write:' + path.basename(p)); return fs.writeFileSync(p, data, enc); },
  };
  const r = publishUpdateFolder({ feed, installer: inst, zip, version: '0.1.8', releaseNotes: ['notes'] }, wrap);
  assert.ok(r.ops.indexOf('copy-installer') < r.ops.indexOf('write-manifest'));
  assert.ok(r.ops.indexOf('copy-zip') < r.ops.indexOf('write-manifest'));
  assert.strictEqual(ops.filter((x) => x.startsWith('write:')).pop(), 'write:qr-release.json');
  assert.ok(fs.existsSync(path.join(feed, '_Archive', 'QR_v0.1.6_Setup.exe')));
  const man = JSON.parse(fs.readFileSync(path.join(feed, 'qr-release.json'), 'utf8'));
  assert.strictEqual(man.latestVersion, '0.1.8');
  assert.strictEqual(man.installerSizeBytes, fs.statSync(path.join(feed, 'QR_v0.1.8_Setup.exe')).size);
  assert.strictEqual(man.installerSha256, crypto.createHash('sha256').update('new-installer').digest('hex'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('IPC, settings tab, banner and i18n exist; no electron-updater', () => {
  const main = src('electron/main.cjs'); const pre = src('electron/preload.cjs'); const st = src('src/settings/SettingsDialog.tsx'); const app = src('src/App.tsx');
  assert.ok(/qr:release-update/.test(main) && /qr:release-update/.test(pre));
  assert.ok(/'updates'/.test(st) && /upd-check-now/.test(st) && /upd-feed/.test(st) && /upd-on-start/.test(st) && /upd-interval/.test(st));
  assert.ok(/UpdateBanner/.test(app) && /4000/.test(src('src/update/useReleaseUpdate.ts')));
  assert.ok(!/"electron-updater"/.test(src('package.json')));
  assert.doesNotMatch(src('electron/qrUpdate.cjs'), /require\(['"]electron-updater['"]\)/);
  const en = JSON.parse(src('src/i18n/en.json')), he = JSON.parse(src('src/i18n/he.json')), ru = JSON.parse(src('src/i18n/ru.json'));
  for (const k of ['st.tab.updates', 'st.upd.feed', 'st.upd.checkNow', 'upd.available', 'upd.now', 'upd.later', 'print.empty']) {
    assert.ok(en[k] && he[k] && ru[k], k);
    assert.doesNotMatch(he[k].replace(/\{\w+\}/g, ''), /[A-Za-z]/, 'he ' + k);
  }
  assert.strictEqual(en['upd.available'], 'Version {version} is available');
  assert.strictEqual(en['print.empty'], 'Print document rendered empty');
  assert.ok(!/Later/.test(src('src/update/UpdateBanner.tsx').split('mandatory')[1]?.slice(0, 200) || '') || /!mandatory/.test(src('src/update/UpdateBanner.tsx')));
});
