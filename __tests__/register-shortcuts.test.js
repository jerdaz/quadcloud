jest.mock('electron', () => ({
  app: { quit: jest.fn() },
  globalShortcut: { register: jest.fn() },
  webContents: { getFocusedWebContents: jest.fn() }
}));

const registerShortcuts = require('../lib/register-shortcuts');
const { globalShortcut, webContents } = require('electron');

test('registers shortcut to open developer tools', () => {
  const views = [];
  const toggleConfig = jest.fn();
  const callbacks = {};

  globalShortcut.register.mockImplementation((accelerator, cb) => {
    callbacks[accelerator] = cb;
  });

  registerShortcuts(views, toggleConfig);

  expect(globalShortcut.register).toHaveBeenCalledWith(
    'CommandOrControl+Alt+I',
    expect.any(Function)
  );

  const openDevTools = jest.fn();
  webContents.getFocusedWebContents.mockReturnValue({ openDevTools });

  callbacks['CommandOrControl+Alt+I']();

  expect(webContents.getFocusedWebContents).toHaveBeenCalled();
  expect(openDevTools).toHaveBeenCalledWith({ mode: 'detach' });
});

test('registers shortcut to open audio selection dialog', () => {
  const views = [];
  const toggleConfig = jest.fn();
  const callbacks = {};

  globalShortcut.register.mockClear();
  webContents.getFocusedWebContents.mockReset();

  globalShortcut.register.mockImplementation((accelerator, cb) => {
    callbacks[accelerator] = cb;
  });

  registerShortcuts(views, toggleConfig);

  expect(globalShortcut.register).toHaveBeenCalledWith(
    'CommandOrControl+S',
    expect.any(Function)
  );

  const executeJavaScript = jest.fn();
  webContents.getFocusedWebContents.mockReturnValue({ executeJavaScript });

  callbacks['CommandOrControl+S']();

  expect(webContents.getFocusedWebContents).toHaveBeenCalled();
  expect(executeJavaScript).toHaveBeenCalled();
});
