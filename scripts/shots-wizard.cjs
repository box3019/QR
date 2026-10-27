// Wizard steps 1-4 on the INSTALLED app (window offscreen), EN + HE. Step 2 opens the first part with friend sections and expands one.
// Usage: node scripts/shots-wizard.cjs <QR.exe> <testDataDir> <outDir>
const { _electron } = require('playwright'); const path = require('path'); const fs = require('fs');
const [exe, data, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const app = await _electron.launch({ executablePath: exe, args: [], env: { ...process.env, QR_PROFILE_DIR: path.join(out, 'profile') } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSkipTaskbar(true); w.unmaximize(); w.setBounds({ x: -30000, y: -30000, width: 1600, height: 1000 }); });
  await win.waitForSelector('[data-testid=dropzone]');
  if (await win.$('[data-testid=first-run-ok]')) await win.click('[data-testid=first-run-ok]');
  for (const lang of ['en', 'he']) { await win.evaluate((l) => window.__qrSetSettings({ uiLanguage: l }), lang); await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, `v014_wizard_step1_${lang}.png`) });
    console.log(lang, 'step1', JSON.stringify(await win.evaluate(() => ({ fs: getComputedStyle(document.querySelector('.mrt-wizard-step-label')).fontSize, states: [...document.querySelectorAll('.mrt-wizard-step')].map((b) => b.dataset.state), addBtn: !!document.querySelector('[data-testid=btn-add]'), folder: !!document.querySelector('[data-testid=btn-choose-folder]'), blue: getComputedStyle(document.querySelector('[data-testid=btn-choose-files]')).backgroundColor })))); }
  for (const size of ['normal', 'large', 'xlarge', 'huge']) { await win.evaluate((z) => window.__qrSetSettings({ uiLanguage: 'he', textSize: z }), size); await win.waitForTimeout(300); await win.screenshot({ path: path.join(out, `v014_wizard_step1_he_${size}.png`) });
    console.log('size', size, await win.evaluate(() => [getComputedStyle(document.documentElement).fontSize, getComputedStyle(document.querySelector('.mrt-wizard-step-label')).fontSize, (document.querySelector('[data-testid=assistant-bubble]') ? getComputedStyle(document.querySelector('[data-testid=assistant-bubble]')).fontSize : 'no-bubble')].join(' '))); }
  await win.evaluate(() => window.__qrSetSettings({ textSize: 'large' }));
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'fixtures', 'RAFAEL_batch1.rar'), path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => document.querySelector('[data-testid=import-files] li[data-status=done], [data-testid=import-files] li[data-status=check]'), null, { timeout: 10 * 60 * 1000 }).catch(() => {});
  await win.screenshot({ path: path.join(out, 'v014_import_busy_he.png') }); console.log('import busy he', await win.evaluate(() => JSON.stringify({ drop: !!document.querySelector('[data-testid=dropzone]'), mails: [...document.querySelectorAll('[data-testid=import-mail]')].length, prog: document.querySelector('[data-testid=import-progress]')?.textContent, st: [...document.querySelectorAll('[data-testid=import-files] li')].map((l) => l.dataset.status).join(','), step: document.querySelector('.mrt-wizard-step[data-state=active]')?.textContent })));
  await win.evaluate(() => window.__qrSetSettings({ uiLanguage: 'en' })); await win.waitForTimeout(400); await win.screenshot({ path: path.join(out, 'v014_import_busy_en.png') }); console.log('import busy en', await win.evaluate(() => JSON.stringify({ drop: !!document.querySelector('[data-testid=dropzone]'), mails: [...document.querySelectorAll('[data-testid=import-mail]')].length, prog: document.querySelector('[data-testid=import-progress]')?.textContent, st: [...document.querySelectorAll('[data-testid=import-files] li')].map((l) => l.dataset.status).join(','), step: document.querySelector('.mrt-wizard-step[data-state=active]')?.textContent })));
  await win.waitForFunction(() => !document.querySelector('[data-testid=import-view][data-active=true]') && document.querySelector('[data-testid=breakdown-panel]'), null, { timeout: 15 * 60 * 1000 });
  console.log('AUTO-ADVANCE', await win.evaluate(() => JSON.stringify({ drop: !!document.querySelector('[data-testid=dropzone]'), mails: [...document.querySelectorAll('[data-testid=import-mail]')].length, prog: document.querySelector('[data-testid=import-progress]')?.textContent, st: [...document.querySelectorAll('[data-testid=import-files] li')].map((l) => l.dataset.status).join(','), step: document.querySelector('.mrt-wizard-step[data-state=active]')?.textContent })));
  const idx = await win.evaluate(() => { const ps = window.__qrParts; let best = 0, n = -1; ps.forEach((p, i) => { const k = (p.requirements || []).reduce((s, r) => s + (r.procs || []).length + (r.masks || []).length, 0); if (k > n) { n = k; best = i; } }); return best; });
  for (const lang of ['en', 'he']) {
    await win.evaluate((l) => window.__qrSetSettings({ uiLanguage: l }), lang);
    await win.evaluate((i) => { window.__qrDetails(false); window.__qrSelect(i, 'drawing'); }, idx);
    await win.waitForTimeout(600);
    const sec = await win.$('[data-testid=bd-coatings][data-empty=false] [data-testid=bd-open-coatings]') || await win.$('[data-testid^=bd-][data-empty=false] [data-testid^=bd-open-]');
    if (sec) { await sec.click(); await win.waitForTimeout(1500); }
    await win.screenshot({ path: path.join(out, `v014_wizard_step2_${lang}.png`) });
    const info = await win.evaluate(() => ({ dir: document.documentElement.dir, of: document.querySelector('[data-testid=card-of]')?.textContent, secs: [...document.querySelectorAll('[data-testid=processes-panel] section.qr-bsec')].map((s) => s.dataset.testid + (s.dataset.empty === 'true' ? '(empty)' : '')), focus: !!document.querySelector('[data-kind=focus]') }));
    console.log(lang, 'step2', JSON.stringify(info));
    for (const st of [1, 3, 4]) { await win.evaluate((s) => window.__qrStep(s), st); await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, st === 1 ? `v014_import_done_${lang}.png` : `v014_wizard_step${st}_${lang}.png`) }); if (st === 1) console.log('import done', lang, await win.evaluate(() => JSON.stringify({ drop: !!document.querySelector('[data-testid=dropzone]'), mails: [...document.querySelectorAll('[data-testid=import-mail]')].length, prog: document.querySelector('[data-testid=import-progress]')?.textContent, st: [...document.querySelectorAll('[data-testid=import-files] li')].map((l) => l.dataset.status).join(','), step: document.querySelector('.mrt-wizard-step[data-state=active]')?.textContent }))); }
  }
  // pan inside the viewer: must scroll only, never import or reset
  await win.evaluate((i) => { window.__qrSetSettings({ uiLanguage: 'he' }); window.__qrSelect(i, 'drawing'); }, idx); await win.waitForTimeout(800);
  const vp = await win.$('[data-testid=drawing-viewport]'); const bx = await vp.boundingBox(); const before = await win.evaluate(() => ({ n: window.__qrParts.length, step: document.querySelector('.mrt-wizard-step[data-state=active]')?.textContent }));
  await win.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await win.mouse.down(); await win.mouse.move(bx.x + bx.width / 2 - 250, bx.y + bx.height / 2 - 150, { steps: 12 }); await win.mouse.up(); await win.waitForTimeout(800);
  await win.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await win.mouse.wheel(0, -300); await win.waitForTimeout(500);
  await win.screenshot({ path: path.join(out, 'v014_step2_pan_he.png') });
  const after = await win.evaluate(() => ({ n: window.__qrParts.length, step: document.querySelector('.mrt-wizard-step[data-state=active]')?.textContent, drop: !!document.querySelector('[data-testid=dropzone]'), scroll: [document.querySelector('[data-testid=drawing-viewport]').scrollLeft, document.querySelector('[data-testid=drawing-viewport]').scrollTop], w: document.querySelector('[data-testid=drawing-sheet]')?.style.width }));
  console.log('PAN', JSON.stringify({ before, after }), before.n === after.n && before.step === after.step && !after.drop ? 'PAN-OK' : 'PAN-FAIL');
  // later drop while loaded: HE toast on step 2, adds parts, toast gone when done
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForSelector('[data-testid=busy]', { timeout: 60000 }).catch(() => {}); await win.waitForTimeout(1500);
  await win.screenshot({ path: path.join(out, 'v014_toast_he.png') }); console.log('TOAST', await win.evaluate(() => { const e = document.querySelector('[data-testid=busy-text]'); return e ? JSON.stringify({ text: e.textContent, cut: e.scrollWidth > e.clientWidth }) : 'none'; }));
  await win.waitForFunction(() => !document.querySelector('[data-testid=busy]'), null, { timeout: 10 * 60 * 1000 }).catch(() => {}); await win.waitForTimeout(1500);
  console.log('APPEND', JSON.stringify(await win.evaluate(() => ({ n: window.__qrParts.length, toast: !!document.querySelector('[data-testid=busy]'), choice: !!document.querySelector('[data-testid=drop-choice]') }))));
  // project tabs: a second project runs in the background; the first keeps its own state; tab drag reorders and never imports
  const T = () => win.evaluate(() => window.__qrTabs());
  const first = await win.evaluate(() => ({ n: window.__qrParts.length })); const t0 = await T();
  await win.evaluate(() => window.__qrAddTab()); await win.waitForTimeout(800);
  win.evaluate((p) => window.__qrRun(p), [path.join(data, 'KLA_matbug_d.pdf')]);
  await win.waitForFunction(() => window.__qrTabs().some((x) => x.status === 'busy'), null, { timeout: 60000 }).catch(() => {}); await win.waitForTimeout(1500);
  await win.screenshot({ path: path.join(out, 'v014_tabs_busy_he.png') }); console.log('TABS busy', JSON.stringify(await T()));
  await win.evaluate((id) => window.__qrSelectTab(id), t0[0].id); await win.waitForTimeout(600);
  await win.screenshot({ path: path.join(out, 'v014_tabs_first_while_busy_he.png') });
  await win.waitForFunction(() => !window.__qrTabs().some((x) => x.status === 'busy'), null, { timeout: 10 * 60 * 1000 }).catch(() => {}); await win.waitForTimeout(1000);
  const tabsDone = await T(); const firstNow = await win.evaluate(() => ({ n: window.__qrParts.length, step: document.querySelector('[data-testid=project][aria-hidden=false]')?.dataset.step }));
  console.log('TABS done', JSON.stringify(tabsDone), 'first', JSON.stringify(first), '->', JSON.stringify(firstNow), first.n === firstNow.n ? 'KEEP-OK' : 'KEEP-FAIL');
  await win.dragAndDrop('[data-testid=tab]:nth-of-type(2)', '[data-testid=tab]:nth-of-type(1)').catch((e) => console.log('drag err', e.message)); await win.waitForTimeout(800);
  const tabsMoved = await T(); console.log('TABS moved', JSON.stringify(tabsMoved.map((x) => x.id)), tabsMoved.length === tabsDone.length && tabsMoved[0].id === tabsDone[1].id ? 'MOVE-OK' : 'MOVE-CHECK', 'parts', await win.evaluate(() => window.__qrParts.length));
  await win.screenshot({ path: path.join(out, 'v014_tabs_he.png') });
  await win.evaluate(() => window.__qrSetSettings({ uiLanguage: 'en' })); await win.waitForTimeout(500); await win.screenshot({ path: path.join(out, 'v014_tabs_en.png') });
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
