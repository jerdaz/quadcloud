const { destroyView, attachViewWithAudio } = require('../lib/view-utils');
const EventEmitter = require('events');

test('destroyView removes view and destroys its contents', () => {
  const win = { removeBrowserView: jest.fn() };
  const view = { destroy: jest.fn() };

  destroyView(win, view);

  expect(win.removeBrowserView).toHaveBeenCalledWith(view);
  expect(view.destroy).toHaveBeenCalled();
});

test('attachViewWithAudio adds view and reapplies audio on events and retries', () => {
  jest.useFakeTimers();
  const win = { addBrowserView: jest.fn() };
  const wc = new EventEmitter();
  wc.setAudioOutputDevice = jest.fn().mockResolvedValue();
  const view = { webContents: wc };

  attachViewWithAudio(win, view, 'dev1', { platform: 'win32' });

  expect(win.addBrowserView).toHaveBeenCalledWith(view);
  expect(wc.setAudioOutputDevice).toHaveBeenCalledWith('dev1');
  const addOrder = win.addBrowserView.mock.invocationCallOrder[0];
  const audioOrder = wc.setAudioOutputDevice.mock.invocationCallOrder[0];
  expect(addOrder).toBeLessThan(audioOrder);

  const initial = wc.setAudioOutputDevice.mock.calls.length;
  wc.emit('did-start-navigation');
  wc.emit('media-started-playing');
  wc.emit('did-stop-loading');
  expect(wc.setAudioOutputDevice).toHaveBeenCalledTimes(initial + 3);

  jest.advanceTimersByTime(2000);
  expect(wc.setAudioOutputDevice).toHaveBeenCalledTimes(initial + 3 + 4);
  jest.useRealTimers();
});

test('attachViewWithAudio skips audio routing on linux', () => {
  const win = { addBrowserView: jest.fn() };
  const wc = { setAudioOutputDevice: jest.fn() };
  const view = { webContents: wc };
  attachViewWithAudio(win, view, 'dev1', { platform: 'linux' });
  expect(win.addBrowserView).toHaveBeenCalledWith(view);
  expect(wc.setAudioOutputDevice).not.toHaveBeenCalled();
});

test('attachViewWithAudio falls back to default on failure', async () => {
  jest.useFakeTimers();
  const win = { addBrowserView: jest.fn() };
  const wc = new EventEmitter();
  const setAudioOutputDevice = jest
    .fn()
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValue();
  wc.setAudioOutputDevice = setAudioOutputDevice;
  const view = { webContents: wc };

  attachViewWithAudio(win, view, 'dev1', { platform: 'darwin' });

  await Promise.resolve();
  await Promise.resolve();

  expect(setAudioOutputDevice).toHaveBeenNthCalledWith(1, 'dev1');
  expect(setAudioOutputDevice).toHaveBeenNthCalledWith(2, 'default');
  jest.useRealTimers();
});
