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

// --- Gamepad isolatie in MAIN WORLD (per kwadrant) ---
function makeGamepadPatch(slot /* number 0..3 */, pinnedId /* string|null */) {
  // embed slot & id als literals
  const SLOT = Number(slot) | 0;
  const ID   = pinnedId ? String(pinnedId).replace(/`/g, "\\`") : null;

  return `
  (() => {
    const nativeGetGamepads = navigator.getGamepads.bind(navigator);
    const slot = ${SLOT};
    const pinnedId = ${ID === null ? 'null' : '`' + ID + '`'};

    function choosePad() {
      const pads = Array.from(nativeGetGamepads());
      if (pinnedId) {
        const byId = pads.find(p => p && p.id === pinnedId);
        return byId || null;
      }
      return pads[slot] || null;
    }

    function proxyGamepad(gp) {
      if (!gp) return null;
      return new Proxy(gp, {
        get(t, p, r) { return p === 'index' ? 0 : Reflect.get(t, p, r); }
      });
    }

    function filteredPadsArray() {
      const chosen = choosePad();
      const out = [null, null, null, null];
      if (chosen) out[0] = proxyGamepad(chosen);
      return out;
    }

    // Override getGamepads in MAIN WORLD
    try {
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: false,
        enumerable: true,
        value: () => filteredPadsArray()
      });
    } catch {}

    // Filter connect/disconnect events
    const wAdd = window.addEventListener.bind(window);
    window.addEventListener = function(type, listener, opts) {
      if (type === 'gamepadconnected' || type === 'gamepaddisconnected') {
        const wrapped = (ev) => {
          const gp = ev && ev.gamepad;
          if (!gp) return;
          const match = pinnedId ? (gp.id === pinnedId) : (gp.index === slot);
          if (!match) return;
          const proxEv = new Proxy(ev, {
            get(t, p, r) { return (p === 'gamepad') ? proxyGamepad(gp) : Reflect.get(t, p, r); }
          });
          try { listener(proxEv); } catch {}
        };
        return wAdd(type, wrapped, opts);
      }
      return wAdd(type, listener, opts);
    };

    // Debug (optioneel): laat zien wat de pagina straks ziet
    // setTimeout(() => console.debug('[QuadCloud mainworld]', location.href, navigator.getGamepads().map(p=>p&&{id:p.id,idx:p.index})), 500);
  })();
  `;
}

function installGamepadIsolation(webContents, slot, pinnedId = null) {
  const code = makeGamepadPatch(slot, pinnedId);

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
  webContents.on('did-frame-navigate', injectAllFrames);

  // Ook bij start navigatie nog eens
  webContents.on('did-start-navigation', injectAllFrames);
}

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
