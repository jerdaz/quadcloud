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

  registerShortcuts(views, toggleConfig, () => 0);

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
  const views = [{}];
  const toggleConfig = jest.fn();
  const callbacks = {};
  const getController = jest.fn().mockReturnValue(1);

  globalShortcut.register.mockClear();
  webContents.getFocusedWebContents.mockReset();

  globalShortcut.register.mockImplementation((accelerator, cb) => {
    callbacks[accelerator] = cb;
  });

  registerShortcuts(views, toggleConfig, getController);

  expect(globalShortcut.register).toHaveBeenCalledWith(
    'CommandOrControl+S',
    expect.any(Function)
  );

  const executeJavaScript = jest.fn();
  webContents.getFocusedWebContents.mockReturnValue({ executeJavaScript });
  callbacks['CommandOrControl+S']();

  expect(webContents.getFocusedWebContents).toHaveBeenCalled();
  expect(executeJavaScript).toHaveBeenCalledWith(expect.stringContaining('Xbox Controller 2'));
  expect(executeJavaScript.mock.calls[0][0]).toContain("overlay.style.display = 'flex'");
});

test('registers shortcut to auto-confirm audio dialog for all quadrants', () => {
  const view1 = { webContents: { executeJavaScript: jest.fn() } };
  const view2 = { webContents: { executeJavaScript: jest.fn() } };
  const views = [view1, view2];
  const toggleConfig = jest.fn();
  const callbacks = {};
  const getController = jest.fn().mockImplementation(i => i);

  globalShortcut.register.mockClear();

  globalShortcut.register.mockImplementation((accelerator, cb) => {
    callbacks[accelerator] = cb;
  });

  registerShortcuts(views, toggleConfig, getController);

  expect(globalShortcut.register).toHaveBeenCalledWith(
    'CommandOrControl+A',
    expect.any(Function)
  );

  callbacks['CommandOrControl+A']();

  const script1 = view1.webContents.executeJavaScript.mock.calls[0][0];
  const script2 = view2.webContents.executeJavaScript.mock.calls[0][0];
  expect(script1).toContain('Xbox Controller');
  expect(script1).toContain('qc-audio-dialog');
  expect(script1).toContain("overlay.style.display = 'none'");
  expect(script1).toContain('apply.click');
  expect(script2).toContain('Xbox Controller 2');
  expect(script2).toContain("overlay.style.display = 'none'");
  expect(script2).toContain('apply.click');
});

test('focus shortcut uses latest view reference', () => {
  const view1 = { webContents: { focus: jest.fn() } };
  const views = [view1];
  const toggleConfig = jest.fn();
  const callbacks = {};

  globalShortcut.register.mockClear();
  globalShortcut.register.mockImplementation((accel, cb) => {
    callbacks[accel] = cb;
  });

  registerShortcuts(views, toggleConfig, () => 0);

  // replace view after registration
  const view2 = { webContents: { focus: jest.fn() } };
  views[0] = view2;

  // should focus the updated view without throwing if undefined
  callbacks['CommandOrControl+Alt+1']();
  expect(view2.webContents.focus).toHaveBeenCalled();

  views[0] = null;
  expect(() => callbacks['CommandOrControl+Alt+1']()).not.toThrow();
});
