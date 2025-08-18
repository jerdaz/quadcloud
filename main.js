const { app, BrowserWindow, BrowserView, session, screen, globalShortcut } = require('electron');
const path = require('path');

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
