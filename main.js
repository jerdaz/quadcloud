const { app, BrowserWindow, BrowserView, session, screen, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let config = {
  audioOutputs: ['default', 'default', 'default', 'default'],
  controllerMapping: [0, 1, 2, 3]
};
let configWindow = null;
let CONFIG_FILE;

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');


function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.audioOutputs)) config.audioOutputs = parsed.audioOutputs;
    if (Array.isArray(parsed.controllerMapping)) config.controllerMapping = parsed.controllerMapping;
  } catch {}
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config));
  } catch {}
}


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

function getGamepadPatch(index) {
  return `
(() => {
  const myIndex = ${index};
  if (window.__gamepadIsolationPatched === myIndex) return;
  window.__gamepadIsolationPatched = myIndex;

  const nativeGetGamepads = navigator.__nativeGetGamepads || navigator.getGamepads.bind(navigator);
  if (!navigator.__nativeGetGamepads) navigator.__nativeGetGamepads = nativeGetGamepads;

  navigator.getGamepads = () => {
    const gamepads = nativeGetGamepads();
    const result = [null, null, null, null];
    const pad = gamepads[myIndex];
    if (pad) {
      const proxied = new Proxy(pad, {
        get(target, prop) {
          return prop === 'index' ? 0 : target[prop];
        }
      });
      result[0] = proxied;
    }
    return result;
  };

  const filterEvent = ev => {
    if (ev.gamepad.index !== myIndex) {
      ev.stopImmediatePropagation();
    } else {
      try { Object.defineProperty(ev.gamepad, 'index', { value: 0 }); } catch {}
    }
  };
  window.addEventListener('gamepadconnected', filterEvent, true);
  window.addEventListener('gamepaddisconnected', filterEvent, true);

  const existing = nativeGetGamepads()[myIndex];
  if (existing) {
    try {
      Object.defineProperty(existing, 'index', { value: 0 });
      const evt = new Event('gamepadconnected');
      Object.defineProperty(evt, 'gamepad', { value: existing });
      window.dispatchEvent(evt);
    } catch {}
  }
})()`;
}

function injectGamepadPatchIntoFrame(frame, index) {
  try { frame.executeJavaScript(getGamepadPatch(index), true); } catch {}
}

function installGamepadIsolation(wc) {
  wc.on('dom-ready', () => {
    try {
      const mf = wc.mainFrame;
      injectGamepadPatchIntoFrame(mf, wc.controllerIndex);
      for (const f of mf.frames) injectGamepadPatchIntoFrame(f, wc.controllerIndex);
    } catch {}
  });

  wc.on('did-frame-navigate', (_e, details) => {
    try {
      const f = wc.mainFrame.frames.find(fr => fr.frameTreeNodeId === details.frameTreeNodeId);
      if (f) injectGamepadPatchIntoFrame(f, wc.controllerIndex);
    } catch {}
  });

  wc.on('frame-created', (_e, details) => {
    try { injectGamepadPatchIntoFrame(details.frame, wc.controllerIndex); } catch {}
  });

  wc.on('did-start-navigation', () => {
    try {
      const mf = wc.mainFrame;
      injectGamepadPatchIntoFrame(mf, wc.controllerIndex);
    } catch {}
  });
}

function applyAudioOutput(index) {
  const view = views[index];
  if (!view) return;
  try { view.webContents.setAudioOutputDevice(config.audioOutputs[index] || 'default'); } catch {}
}

function applyController(index) {
  const view = views[index];
  if (!view) return;
  const controllerIndex = config.controllerMapping[index];
  view.webContents.controllerIndex = controllerIndex;
  try {
    const mf = view.webContents.mainFrame;
    injectGamepadPatchIntoFrame(mf, controllerIndex);
    for (const f of mf.frames) injectGamepadPatchIntoFrame(f, controllerIndex);
  } catch {}
}

function setAudioOutput(index, deviceId) {
  config.audioOutputs[index] = deviceId;
  applyAudioOutput(index);
  saveConfig();
}

function setController(index, controllerIndex) {
  const other = config.controllerMapping.indexOf(controllerIndex);
  if (other !== -1 && other !== index) {
    const tmp = config.controllerMapping[index];
    config.controllerMapping[other] = tmp;
    applyController(other);
  }
  config.controllerMapping[index] = controllerIndex;
  applyController(index);
  saveConfig();
  return config.controllerMapping;
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
  const controllerIndex = config.controllerMapping[index] ?? index;
  view.webContents.controllerIndex = controllerIndex;
  view.setBounds({ x, y, width, height });
  view.setAutoResize({ width: true, height: true });
  view.webContents.setBackgroundThrottling(false);
  installXcloudFocusWorkaround(view.webContents);
  installGamepadIsolation(view.webContents);
  view.webContents.loadURL(URLs[index]);
  view.webContents.on('did-finish-load', () => applyAudioOutput(index));
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
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    openConfigWindow();
  });
}

function openConfigWindow() {
  if (configWindow) {
    configWindow.focus();
    return;
  }
  configWindow = new BrowserWindow({
    width: 600,
    height: 400,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'configPreload.js')
    }
  });
  configWindow.on('closed', () => { configWindow = null; });
  configWindow.loadFile(path.join(__dirname, 'config.html'));
}

ipcMain.handle('get-config', () => config);
ipcMain.handle('set-audio-output', (_e, { index, deviceId }) => {
  setAudioOutput(index, deviceId);
});
ipcMain.handle('set-controller', (_e, { index, controller }) => {
  return setController(index, controller);
});

app.whenReady().then(() => {
  CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
  loadConfig();
  createWindow();
  registerShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
