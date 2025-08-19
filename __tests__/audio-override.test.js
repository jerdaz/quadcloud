/** @jest-environment jsdom */

jest.mock('electron', () => ({
  ipcRenderer: { on: jest.fn() }
}));

const { ipcRenderer } = require('electron');

jest.useFakeTimers();

test('set-audio-device applies sinkId to all videos', () => {
  document.body.innerHTML = '<video id="v1"></video><video id="v2"></video>';
  const videos = Array.from(document.querySelectorAll('video'));
  videos.forEach(v => { v.setSinkId = jest.fn(); });

  require('../preload');

  const handler = ipcRenderer.on.mock.calls.find(c => c[0] === 'set-audio-device')[1];
  handler(null, 'device1');
  jest.runOnlyPendingTimers();

  videos.forEach(v => {
    expect(v.setSinkId).toHaveBeenCalledWith('device1');
  });
});
