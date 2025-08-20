const { app, BrowserWindow, BrowserView, session, screen, globalShortcut, ipcMain } = require('electron');
const registerShortcuts = require('./lib/register-shortcuts');
const path = require('path');
const fs = require('fs');
const { XBOX_HOST_RE, getGamepadPatch } = require('./lib/xcloud');
const ProfileStore = require('./lib/profile-store');
const { destroyView, closeConfigView } = require('./lib/view-utils');

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

let profileStore;
const views = [];
const configViews = [];
let controllerAssignments = [0, 1, 2, 3];
let win;
let viewWidth = 0;
let viewHeight = 0;
let positions = [];


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

function injectPatchIntoFrame(frame) {
  try {
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

function injectGamepadPatchIntoFrame(frame, index) {
  try { frame.executeJavaScript(getGamepadPatch(index), true); } catch {}
}

function installGamepadIsolation(wc, index) {
  wc.on('dom-ready', () => {
    try {
      const mf = wc.mainFrame;
      injectGamepadPatchIntoFrame(mf, index);
      for (const f of mf.frames) injectGamepadPatchIntoFrame(f, index);
    } catch {}
  });

  wc.on('did-frame-navigate', (_e, details) => {
    try {
      const f = wc.mainFrame.frames.find(fr => fr.frameTreeNodeId === details.frameTreeNodeId);
      if (f) injectGamepadPatchIntoFrame(f, index);
    } catch {}
  });

  wc.on('frame-created', (_e, details) => {
    try { injectGamepadPatchIntoFrame(details.frame, index); } catch {}
  });

  wc.on('did-start-navigation', () => {
    try {
      const mf = wc.mainFrame;
      injectGamepadPatchIntoFrame(mf, index);
    } catch {}
  });
}

const BETTER_XCLOUD_PATH = path.join(__dirname, 'better-xcloud.user.js');
let BETTER_XCLOUD_SCRIPT = null;
try {
  if (fs.existsSync(BETTER_XCLOUD_PATH)) {
    BETTER_XCLOUD_SCRIPT = fs.readFileSync(BETTER_XCLOUD_PATH, 'utf8');
  }
} catch {}

function injectBetterXcloudIntoFrame(frame) {
  if (!BETTER_XCLOUD_SCRIPT) return;
  try { frame.executeJavaScript(BETTER_XCLOUD_SCRIPT, true); } catch {}
}

function installBetterXcloud(wc) {
  if (!BETTER_XCLOUD_SCRIPT) return;
  wc.on('dom-ready', () => {
    try {
      const mf = wc.mainFrame;
      injectBetterXcloudIntoFrame(mf);
      for (const f of mf.frames) injectBetterXcloudIntoFrame(f);
    } catch {}
  });

  wc.on('did-frame-navigate', (_e, details) => {
    try {
      const f = wc.mainFrame.frames.find(fr => fr.frameTreeNodeId === details.frameTreeNodeId);
      if (f) injectBetterXcloudIntoFrame(f);
    } catch {}
  });

  wc.on('frame-created', (_e, details) => {
    try { injectBetterXcloudIntoFrame(details.frame); } catch {}
  });

  wc.on('did-start-navigation', () => {
    try {
      const mf = wc.mainFrame;
      injectBetterXcloudIntoFrame(mf);
    } catch {}
  });
}

const URLs = [
  'https://xbox.com/play',
  'https://xbox.com/play',
  'https://xbox.com/play',
  'https://xbox.com/play'
];

function createView(x, y, width, height, slot, profileId, controllerIndex) {
  const viewSession = session.fromPartition(`persist:${profileId}`);
  if (!viewSession.__quadPermHandlersInstalled) {
    viewSession.setPermissionRequestHandler((wc, permission, callback, details) => {
      let host = '';
      try { host = new URL(details.requestingUrl).hostname; } catch {}
      if (host && XBOX_HOST_RE.test(host) && (permission === 'media' || permission === 'speaker-selection')) {
        return callback(true);
      }
      callback(false);
    });
    viewSession.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
      let host = '';
      try { host = new URL(requestingOrigin).hostname; } catch {}
      if (host && XBOX_HOST_RE.test(host) && (permission === 'media' || permission === 'speaker-selection')) {
        return true;
      }
      return false;
    });
    viewSession.__quadPermHandlersInstalled = true;
  }
  const view = new BrowserView({
    webPreferences: {
      session: viewSession,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  view.webContents.controllerIndex = controllerIndex;
  view.setBounds({ x, y, width, height });
  view.setAutoResize({ width: true, height: true });
  view.webContents.setBackgroundThrottling(false);
  installXcloudFocusWorkaround(view.webContents);
  installGamepadIsolation(view.webContents, controllerIndex);
  installBetterXcloud(view.webContents);
  const audioDevice = profileStore.getAudio(slot);
  if (audioDevice) {
    const apply = () => applyAudioOutput(slot, audioDevice);
    view.webContents.on('did-finish-load', apply);
    view.webContents.on('did-frame-finish-load', apply);
  }
  view.webContents.loadURL(URLs[slot % URLs.length]);
  return view;
}

function createWindow() {
  // Use the full display size instead of the work area to avoid leaving
  // a blank space where the taskbar would normally be.
  const { width, height } = screen.getPrimaryDisplay().size;
  win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000'
  });

  win.loadFile(path.join(__dirname, 'background.html'));

  viewWidth = Math.floor(width / 2);
  viewHeight = Math.floor(height / 2);
  positions = [
    { x: 0,         y: 0 },
    { x: viewWidth, y: 0 },
    { x: 0,         y: viewHeight },
    { x: viewWidth, y: viewHeight }
  ];
positions.forEach((pos, i) => {
    let profileId = profileStore.getAssignment(i);
    if (!profileId) {
      profileId = profileStore.createProfile(`player${i + 1}`);
      profileStore.assignProfile(i, profileId);
    }
    const controller = profileStore.getController(i);
    controllerAssignments[i] = controller ?? controllerAssignments[i];
    profileStore.assignController(i, controllerAssignments[i]);
    if (profileStore.isDisabled(i)) {
      views[i] = null;
      return;
    }
    const view = createView(pos.x, pos.y, viewWidth, viewHeight, i, profileId, controllerAssignments[i]);
    win.addBrowserView(view);
    views[i] = view;
  });
}

function getConfigView(index) {
  let cfg = configViews[index];
  if (cfg) return cfg;
  cfg = new BrowserView({
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  cfg.setBounds({ x: positions[index].x, y: positions[index].y, width: viewWidth, height: viewHeight });
  cfg.setAutoResize({ width: true, height: true });
  cfg.webContents.loadFile(path.join(__dirname, 'assets', 'config.html'));
  configViews[index] = cfg;
  return cfg;
}

function gatherConfigData(index) {
  const profileId = profileStore.getAssignment(index);
  return {
    index,
    name: profileStore.getProfiles()[profileId],
    profiles: profileStore.getProfiles(),
    currentProfile: profileId,
    controllers: [0,1,2,3],
    currentController: controllerAssignments[index],
    currentAudio: profileStore.getAudio(index),
    enabled: !profileStore.isDisabled(index)
  };
}

function toggleConfig(index) {
  const cfg = getConfigView(index);
  if (win.getBrowserViews().includes(cfg)) {
    win.removeBrowserView(cfg);
  } else {
    cfg.setBounds({ x: positions[index].x, y: positions[index].y, width: viewWidth, height: viewHeight });
    win.addBrowserView(cfg);
    cfg.webContents.send('init', gatherConfigData(index));
  }
}

function reloadView(slot) {
  const pos = positions[slot];
  destroyView(win, views[slot]);
  const profileId = profileStore.getAssignment(slot);
  const controller = controllerAssignments[slot];
  const view = createView(pos.x, pos.y, viewWidth, viewHeight, slot, profileId, controller);
  win.addBrowserView(view);
  views[slot] = view;
}

function applyAudioOutput(index, deviceId) {
  const view = views[index];
  if (!view) return;
  const js = `
    (async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
          try { await navigator.mediaDevices.selectAudioOutput({ deviceId: '${deviceId}' }); } catch {}
        }
        const els = document.querySelectorAll('audio, video');
        for (const el of els) {
          if (typeof el.setSinkId === 'function') {
            try { await el.setSinkId('${deviceId}'); } catch {}
          }
        }
      } catch {}
    })();
  `;
  try { view.webContents.executeJavaScript(js); } catch {}
}

ipcMain.on('config-ready', (e) => {
  const index = configViews.findIndex(cv => cv && cv.webContents === e.sender);
  if (index !== -1) {
    e.sender.send('init', gatherConfigData(index));
  }
});

ipcMain.on('rename-profile', (_e, { index, name }) => {
  const id = profileStore.getAssignment(index);
  profileStore.renameProfile(id, name);
});

ipcMain.on('create-profile', (_e, { index, name }) => {
  const id = profileStore.createProfile(name);
  profileStore.assignProfile(index, id);
  reloadView(index);
  const cfg = configViews[index];
  if (cfg) cfg.webContents.send('init', gatherConfigData(index));
});

ipcMain.on('select-profile', (_e, { index, profileId }) => {
  profileStore.assignProfile(index, profileId);
  closeConfigView(win, configViews, index);
  reloadView(index);
});

ipcMain.on('select-controller', (_e, { index, controller }) => {
  controllerAssignments[index] = controller;
  profileStore.assignController(index, controller);
  closeConfigView(win, configViews, index);
  reloadView(index);
});

ipcMain.on('select-audio', (_e, { index, deviceId }) => {
  profileStore.assignAudio(index, deviceId);
  closeConfigView(win, configViews, index);
  applyAudioOutput(index, deviceId);
});

ipcMain.on('set-enabled', (_e, { index, enabled }) => {
  profileStore.setDisabled(index, !enabled);
  closeConfigView(win, configViews, index);
  if (enabled) {
    reloadView(index);
  } else {
    destroyView(win, views[index]);
    views[index] = null;
  }
});

ipcMain.on('close-config', (_e, { index }) => {
  closeConfigView(win, configViews, index);
});

app.whenReady().then(() => {
  profileStore = new ProfileStore(path.join(app.getPath('userData'), 'profiles.json'));
  createWindow();
  registerShortcuts(views, toggleConfig, index => controllerAssignments[index]);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
