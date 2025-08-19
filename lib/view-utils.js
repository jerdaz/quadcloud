function destroyView(win, view) {
  if (!view) return;
  try { win.removeBrowserView(view); } catch {}
  try { view.webContents.destroy(); } catch {}
  try { if (typeof view.destroy === 'function') view.destroy(); } catch {}
}

function attachViewWithAudio(win, view, deviceId) {
  win.addBrowserView(view);
  if (deviceId) {
    try {
      const p = view.webContents.setAudioOutputDevice(deviceId);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }
}

module.exports = { destroyView, attachViewWithAudio };
