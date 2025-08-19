function destroyView(win, view) {
  if (!view) return;
  try { win.removeBrowserView(view); } catch {}
  try { view.webContents.destroy(); } catch {}
  try { if (typeof view.destroy === 'function') view.destroy(); } catch {}
}

module.exports = { destroyView };
