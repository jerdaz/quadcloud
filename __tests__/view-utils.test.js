const { destroyView, attachViewWithAudio } = require('../lib/view-utils');

test('destroyView removes view and destroys its contents', () => {
  const win = { removeBrowserView: jest.fn() };
  const webContents = { destroy: jest.fn() };
  const view = { webContents, destroy: jest.fn() };

  destroyView(win, view);

  expect(win.removeBrowserView).toHaveBeenCalledWith(view);
  expect(webContents.destroy).toHaveBeenCalled();
  expect(view.destroy).toHaveBeenCalled();
});

test('attachViewWithAudio adds view before setting audio device', () => {
  const win = { addBrowserView: jest.fn() };
  const wc = { setAudioOutputDevice: jest.fn().mockResolvedValue() };
  const view = { webContents: wc };

  attachViewWithAudio(win, view, 'dev1');

  expect(win.addBrowserView).toHaveBeenCalledWith(view);
  expect(wc.setAudioOutputDevice).toHaveBeenCalledWith('dev1');
  const addOrder = win.addBrowserView.mock.invocationCallOrder[0];
  const audioOrder = wc.setAudioOutputDevice.mock.invocationCallOrder[0];
  expect(addOrder).toBeLessThan(audioOrder);
});

