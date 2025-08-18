// main.js — QuadCloud (4×1080p op 4K, per-kwadrant sessies & controllers)
const { app, BrowserWindow, BrowserView, globalShortcut, ipcMain, session, screen } = require('electron');
const path = require('path');

// --- Scherm/Chrome tweaks: pixel-perfect & geen storende media-keys -----
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

// --- Basis URL (kan je aanpassen of per-kwadrant via query meegeven) -----
const URL_DEFAULT = 'https://www.xbox.com/play';

let win;
const views = []; // [{ view, idx }]

// Helper: focus een quadrant (Ctrl+Alt+1..4)
function focusQuadrant(i) {
  const v = views[i]?.view;
  if (v) v.webContents.focus();
}

function createWindow() {
  const { width: W, height: H } = screen.getPrimaryDisplay().size; // verwacht 3840x2160
  const halfW = Math.floor(W / 2);
  const halfH = Math.floor(H / 2);

  // Volledig randloos hoofdvenster
  win = new BrowserWindow({
    width: W,
    height: H,
    x: 0,
    y: 0,
    frame: false,
    show: true,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Kwadranten (LB, RB, LO, RO)
  const quadrants = [
    { x: 0,       y: 0,       w: halfW, h: halfH }, // 0
    { x: halfW,   y: 0,       w: halfW, h: halfH }, // 1
    { x: 0,       y: halfH,   w: halfW, h: halfH }, // 2
    { x: halfW,   y: halfH,   w: halfW, h: halfH }  // 3
  ];

  for (let i = 0; i < 4; i++) {
    // Gescheiden profielen per speler (cookies, logins)
    const part = `persist:player${i + 1}`;
    const ses = session.fromPartition(part, { cache: true });

    // Optioneel: user-agent fine-tune voor xCloud (meestal niet nodig)
    // ses.setUserAgent(ses.getUserAgent().replace('Chrome/', 'Edg/'));

    const view = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        partition: part,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        enableBlinkFeatures: 'GamepadButton,GamepadExtensions',
        // Belangrijk: geef controller-slot door aan preload (0..3)
        additionalArguments: [`--controllerSlot=${i}`]
        // Optioneel (stabieler): pin op controllerId i.p.v. slot:
        // additionalArguments: [`--controllerSlot=${i}`, `--controllerId=EXACTE_ID_VAN_GAMEPAD`]
      }
    });

    win.addBrowserView(view);
    view.setBounds({ x: quadrants[i].x, y: quadrants[i].y, width: quadrants[i].w, height: quadrants[i].h });
    view.setAutoResize({ width: true, height: true });

    // Minimalistische launcher per quadrant
    const launcherUrl = new URL(`file://${path.join(__dirname, 'renderer', 'index.html')}`);
    launcherUrl.searchParams.set('q', String(i + 1));
    launcherUrl.searchParams.set('default', URL_DEFAULT);
    view.webContents.loadURL(launcherUrl.toString());

    // Houd “fullscreen” van sites binnen het quadrant (blokkeer F11-venster toggle)
    view.webContents.on('enter-html-full-screen', () => {
      if (win.isFullScreen()) win.setFullScreen(true);
    });
    view.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F11') event.preventDefault();
    });

    // Randjes weg & video/canvas netjes laten vullen
    view.webContents.on('dom-ready', () => {
      view.webContents.insertCSS(`
        html, body { margin:0 !important; padding:0 !important; overflow:hidden !important; background:#000 !important; }
        *::-webkit-scrollbar { display:none !important; }
        video, canvas { image-rendering: pixelated; }
      `);
    });

    views.push({ view, idx: i });
  }

  // Sneltoetsen
  globalShortcut.register('Control+Alt+Digit1', () => focusQuadrant(0));
  globalShortcut.register('Control+Alt+Digit2', () => focusQuadrant(1));
  globalShortcut.register('Control+Alt+Digit3', () => focusQuadrant(2));
  globalShortcut.register('Control+Alt+Digit4', () => focusQuadrant(3));
  globalShortcut.register('Control+Alt+Q', () => { app.quit(); });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // macOS alleen: opnieuw maken als er geen vensters zijn en app geactiveerd wordt
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Op Windows/Linux gewoon afsluiten
  app.quit();
});

// IPC vanuit launcher (per quadrant)
ipcMain.handle('quad:loadURL', (event, url) => {
  const wc = event.sender;
  wc.loadURL(url);
});

ipcMain.handle('quad:boostContentCSS', (event) => {
  const wc = event.sender;
  wc.insertCSS(`
    html, body { background:#000; overflow:hidden; }
    video, #player, .fullscreen, [data-testid="full-screen"], [aria-label*="Full screen"] { width:100% !important; height:100% !important; }
  `);
});
