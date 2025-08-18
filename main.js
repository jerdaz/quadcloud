const { app, BrowserWindow, BrowserView, session } = require('electron');
const path = require('path');

const URLs = [
  'https://xbox.com/play',
  'https://xbox.com/play',
  'https://xbox.com/play',
  'https://xbox.com/play'
];

function createView(x, y, index) {
  const viewSession = session.fromPartition(`persist:player${index}`);
  const view = new BrowserView({
    webPreferences: {
      session: viewSession,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--controllerIndex=${index}`]
    }
  });
  view.setBounds({ x, y, width: 1920, height: 1080 });
  view.webContents.loadURL(URLs[index]);
  return view;
}

function createWindow() {
  const win = new BrowserWindow({ fullscreen: true, frame: false, autoHideMenuBar: true });
  const positions = [
    { x: 0,    y: 0 },
    { x: 1920, y: 0 },
    { x: 0,    y: 1080 },
    { x: 1920, y: 1080 }
  ];
  positions.forEach((pos, i) => {
    const view = createView(pos.x, pos.y, i);
    win.addBrowserView(view);
  });
}

app.whenReady().then(createWindow);
