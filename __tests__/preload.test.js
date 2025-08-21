const deviceListeners = {};
const windowListeners = {};

global.navigator = {
  mediaDevices: {
    addEventListener: jest.fn((event, cb) => {
      deviceListeners[event] = cb;
    })
  }
};

global.window = {
  addEventListener: jest.fn((event, cb) => {
    windowListeners[event] = cb;
  })
};

global.document = { body: { style: {} } };

jest.mock('electron', () => ({
  ipcRenderer: { send: jest.fn() }
}));

require('../preload.js');

test('notifies main process when audio devices change', () => {
  expect(navigator.mediaDevices.addEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
  const { ipcRenderer } = require('electron');
  deviceListeners.devicechange();
  expect(ipcRenderer.send).toHaveBeenCalledWith('audio-devices-changed');
});
