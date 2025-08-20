const { app, globalShortcut, webContents } = require('electron');

function registerShortcuts(views, toggleConfig) {
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });

  globalShortcut.register('CommandOrControl+Alt+I', () => {
    const wc = webContents.getFocusedWebContents();
    if (wc) {
      wc.openDevTools({ mode: 'detach' });
    }
  });

  views.forEach((view, i) => {
    globalShortcut.register(`CommandOrControl+${i + 1}`, () => {
      toggleConfig(i);
    });
    globalShortcut.register(`CommandOrControl+Alt+${i + 1}`, () => {
      view.webContents.focus();
    });
  });
}

module.exports = registerShortcuts;
