const { app, BrowserWindow, BrowserView, session, screen, globalShortcut } = require('electron');
const path = require('path');

// --- xCloud focus/visibility spoof: inject into MAIN WORLD + all frames ---
const XBOX_HOST_RE = /(^|\.)xbox\.com$/i;

const XFOCUS_PATCH = `
(() => {
  const docProto = Document.prototype;
  try { Object.defineProperty(docProto, 'hidden', {configurable:true, get(){return false}}) } catch {}
  try { Object.defineProperty(docProto, 'webkitHidden', {configurable:true, get(){return false}}) } catch {}
  try { Object.defineProperty(docProto, 'visibilityState', {configurable:true, get(){return 'visible'}}) } catch {}
  try {
    Object.defineProperty(docProto, 'hasFocus', {
      configurable: true,
      value: function(){ return true; }
    });
  } catch {}

  // Swallow visibilitychange/blur on window + document
  const wAdd = window.addEventListener.bind(window);
  window.addEventListener = function(type, listener, opts){
    if (type === 'blur' || type === 'visibilitychange') {
      // swallow
      return wAdd(type, () => {}, opts);
    }
    return wAdd(type, listener, opts);
  };
  const dAdd = Document.prototype.addEventListener.bind(document);
  Document.prototype.addEventListener = function(type, listener, opts){
    if (type === 'visibilitychange') {
      return dAdd.call(this, type, () => {}, opts);
    }
    return dAdd.call(this, type, listener, opts);
  };

  // Periodic focus events
  const fireFocus = () => {
    try { window.dispatchEvent(new Event('focus')); } catch {}
    try { document.dispatchEvent(new Event('focus')); } catch {}
  };
  fireFocus();
  setInterval(fireFocus, 5000);

  // Attempt to dismiss focus overlays
  const tryDismiss = () => {
    const root = document;
    const sel = [
      'button', '[role=button]',
      '[data-testid*="activate" i]', '[aria-label*="activate" i]',
      '[aria-label*="focus" i]'
    ].join(',');
    for (const el of root.querySelectorAll(sel)) {
      const txt = (el.innerText || el.textContent || '').toLowerCase();
      if (/(click|klik).*here|hier|activate|activeren|focus/.test(txt)) {
        try { el.click(); return; } catch {}
      }
    }
  };
  tryDismiss();
  const mo = new MutationObserver(tryDismiss);
  mo.observe(document.documentElement, { childList:true, subtree:true });
})()
`;

function injectPatchIntoFrame(frame) {
  try {
    const url = frame.url || '';
    let host = '';
    try { host = new URL(url).hostname; } catch {}
    if (!host || !XBOX_HOST_RE.test(host)) return;
    return frame.executeJavaScript(XFOCUS_PATCH, true);
  } catch {
    // ignore
  }
}

function installXcloudFocusWorkaround(wc) {
  wc.on('dom-ready', () => {
    try {
      const mf = wc.mainFrame;
      injectPatchIntoFrame(mf);
      for (const f of mf.frames) injectPatchIntoFrame(f);
    } catch {}
  });

  wc.on('did-frame-navigate', (_e, details) => {
    try {
      const f = wc.mainFrame.frames.find(fr => fr.frameTreeNodeId === details.frameTreeNodeId);
      if (f) injectPatchIntoFrame(f);
    } catch {}
  });

  wc.on('frame-created', (_e, details) => {
    try { injectPatchIntoFrame(details.frame); } catch {}
  });

  wc.on('did-start-navigation', () => {
    try {
      const mf = wc.mainFrame;
      injectPatchIntoFrame(mf);
    } catch {}
  });
}

const URLs = [
  'https://xbox.com/play',
  'https://xbox.com/play',
  'https://xbox.com/play',
  'https://xbox.com/play'
];

function createView(x, y, width, height, index) {
  const viewSession = session.fromPartition(`persist:player${index}`);
  const view = new BrowserView({
    webPreferences: {
      session: viewSession,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--controllerIndex=${index}`]
    }
  });
  view.setBounds({ x, y, width, height });
  installXcloudFocusWorkaround(view.webContents);
  view.webContents.loadURL(URLs[index]);
  return view;
}

const views = [];

function createWindow() {
  // Use the full display size instead of the work area to avoid leaving
  // a blank space where the taskbar would normally be.
  const { width, height } = screen.getPrimaryDisplay().size;
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000'
  });

  win.loadFile(path.join(__dirname, 'background.html'));

  const viewWidth = Math.floor(width / 2);
  const viewHeight = Math.floor(height / 2);
  const positions = [
    { x: 0,         y: 0 },
    { x: viewWidth, y: 0 },
    { x: 0,         y: viewHeight },
    { x: viewWidth, y: viewHeight }
  ];
  positions.forEach((pos, i) => {
    const view = createView(pos.x, pos.y, viewWidth, viewHeight, i);
    win.addBrowserView(view);
    views[i] = view;
  });
  views[0].webContents.focus();
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });
  views.forEach((view, i) => {
    globalShortcut.register(`CommandOrControl+${i + 1}`, () => {
      view.webContents.focus();
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
