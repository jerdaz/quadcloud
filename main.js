const { app, BrowserWindow, BrowserView, session, screen, globalShortcut } = require('electron');
const path = require('path');

// --- xCloud focus/visibility spoof: inject into MAIN WORLD + all frames ---
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

// --- Gamepad isolatie in MAIN WORLD (per kwadrant) ---
function makeGamepadPatchCode(slot /* number 0..3 */, pinnedId /* string|null */) {
  const SLOT = Number(slot) | 0;
  const PID  = pinnedId ? '`' + String(pinnedId).replace(/`/g, '\\`') + '`' : 'null';

  return `
  (() => {
    function getNativeGetGamepads() {
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'getGamepads')
               || Object.getOwnPropertyDescriptor(navigator.__proto__, 'getGamepads');
      const fn = (desc && (desc.value || desc.get)) || navigator.getGamepads;
      return fn.call.bind(fn, navigator);
    }
    const nativeGetGamepads = getNativeGetGamepads();

    const SLOT = ${SLOT};
    const PINNED_ID = ${PID};

    function choosePad() {
      const pads = Array.from(nativeGetGamepads() || []);
      if (PINNED_ID) return pads.find(p => p && p.id === PINNED_ID) || null;
      return pads[SLOT] || null;
    }

    function proxyPad(gp) {
      if (!gp) return null;
      return new Proxy(gp, { get(t,p,r){ return p === 'index' ? 0 : Reflect.get(t,p,r); } });
    }

    function filteredPads() {
      const chosen = choosePad();
      const out = [null, null, null, null];
      if (chosen) out[0] = proxyPad(chosen);
      return out;
    }

    try {
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: true,
        enumerable: true,
        value: () => filteredPads()
      });
    } catch {}

    const wAdd = window.addEventListener.bind(window);
    window.addEventListener = function(type, listener, opts){
      if (type === 'gamepadconnected' || type === 'gamepaddisconnected') {
        const wrapped = (ev) => {
          const gp = ev && ev.gamepad; if (!gp) return;
          const ok = PINNED_ID ? (gp.id === PINNED_ID) : (gp.index === SLOT);
          if (!ok) return;
          const proxEv = new Proxy(ev, { get(t,p,r){ return p === 'gamepad' ? proxyPad(gp) : Reflect.get(t,p,r); } });
          try { listener(proxEv); } catch {}
        };
        return wAdd(type, wrapped, opts);
      }
      return wAdd(type, listener, opts);
    };
  })();
  `;
}

function installGamepadIsolation(webContents, slot, pinnedId = null) {
  const code = makeGamepadPatchCode(slot, pinnedId);

  function injectFrame(frame) {
    try { return frame.executeJavaScript(code, true); } catch {}
  }

  function injectAllFrames() {
    try {
      const mf = webContents.mainFrame;
      injectFrame(mf);
      for (const f of mf.frames) injectFrame(f);
    } catch {}
  }

  // Eerste keer zodra DOM klaar is
  webContents.on('dom-ready', injectAllFrames);

  // Op nieuwe frames
  webContents.on('frame-created', (_e, details) => {
    try { injectFrame(details.frame); } catch {}
  });

  // Op elke (sub)frame navigatie
  webContents.on('did-frame-navigate', () => { injectAllFrames(); });

  // Ook bij start navigatie nog eens
  webContents.on('did-start-navigation', () => { injectAllFrames(); });

  // Korte retry-pulse voor laat binnenkomende frames
  let retries = 8;
  const iv = setInterval(() => {
    injectAllFrames();
    if (--retries <= 0) clearInterval(iv);
  }, 250);
}

function installXcloudFocusWorkaround(webContents) {
  function injectFrame(frame) {
    try { return frame.executeJavaScript(XFOCUS_PATCH, true); } catch {}
  }

  function injectAllFrames() {
    try {
      const mf = webContents.mainFrame;
      injectFrame(mf);
      for (const f of mf.frames) injectFrame(f);
    } catch {}
  }

  webContents.on('dom-ready', injectAllFrames);

  webContents.on('frame-created', (_e, details) => {
    try { injectFrame(details.frame); } catch {}
  });

  webContents.on('did-frame-navigate', () => { injectAllFrames(); });

  webContents.on('did-start-navigation', () => { injectAllFrames(); });

  let retries = 8;
  const iv = setInterval(() => {
    injectAllFrames();
    if (--retries <= 0) clearInterval(iv);
  }, 250);
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
      preload: path.join(__dirname, 'preload.js')
    }
  });
  view.setBounds({ x, y, width, height });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
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
    installXcloudFocusWorkaround(view.webContents);
    installGamepadIsolation(view.webContents, i);
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
