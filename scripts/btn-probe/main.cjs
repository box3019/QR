const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => { const w = new BrowserWindow({ x: -30000, y: -30000, width: 900, height: 400, skipTaskbar: true, show: true }); w.loadFile(process.env.PROBE_HTML); });
