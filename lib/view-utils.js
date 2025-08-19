function destroyView(win, view) {
  if (!view) return;
  try { win.removeBrowserView(view); } catch {}
  try { view.webContents.destroy(); } catch {}
  try { if (typeof view.destroy === 'function') view.destroy(); } catch {}
}

function closeConfigView(win, configViews, index) {
  const cfg = configViews[index];
  if (!cfg) return;
  try { win.removeBrowserView(cfg); } catch {}
  configViews[index] = undefined;
}

module.exports = { destroyView, closeConfigView };
