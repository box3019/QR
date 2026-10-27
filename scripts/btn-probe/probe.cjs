// usage: node probe.cjs <html> <outPrefix>  -> dumps computed styles of [data-p] buttons in states
const { _electron } = require(process.env.QRAPP + '/node_modules/playwright');
const fs = require('fs');
const PROPS = ['border-radius','border-top-width','border-top-style','border-top-color','background-color','background-image','color','padding-top','padding-right','padding-bottom','padding-left','height','min-height','font-size','font-weight','font-family','line-height','box-shadow','opacity','outline-style','outline-width','outline-color','outline-offset','transform','transition-duration','cursor','gap'];
(async () => {
  const [html, out] = process.argv.slice(2);
  const eapp = await _electron.launch({ executablePath: require(process.env.QRAPP + '/node_modules/electron'), args: [__dirname + '/main.cjs'], env: { ...process.env, PROBE_HTML: html } });
  const p = await eapp.firstWindow(); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  const ids = await p.$$eval('[data-p]', es => es.map(e => e.dataset.p));
  const get = (id) => p.$eval(`[data-p="${id}"]`, (e, P) => { const c = getComputedStyle(e); return Object.fromEntries(P.map(k => [k, c.getPropertyValue(k)])); }, PROPS);
  const res = {};
  for (const id of ids) {
    res[id] = { normal: await get(id) };
    if (!id.includes('disabled')) {
      await p.hover(`[data-p="${id}"]`); await p.waitForTimeout(300); res[id].hover = await get(id); await p.mouse.down(); await p.waitForTimeout(300); res[id].active = await get(id); await p.mouse.up();
      await p.mouse.move(0, 390); await p.focus(`[data-p="${id}"]`);
      await p.keyboard.press('Shift'); await p.waitForTimeout(300); res[id].focus = await get(id);
      await p.$eval(`[data-p="${id}"]`, e => e.blur());
    }
  }
  fs.writeFileSync(out + '.json', JSON.stringify(res, null, 1));
  await (await p.$('#shot')).screenshot({ path: out + '.png' });
  await eapp.close();
})().catch(e => { console.error(e); process.exit(1); });
