const { applyAudioOutput } = require('../lib/audio');

test('applyAudioOutput injects selectAudioOutput and uses mainFrame', () => {
  const executed = [];
  const view = {
    webContents: {
      mainFrame: {
        executeJavaScript: code => {
          executed.push(code);
          return Promise.resolve();
        }
      }
    }
  };

  applyAudioOutput(view, 'my-device');
  expect(executed).toHaveLength(1);
  expect(executed[0]).toContain('navigator.mediaDevices.selectAudioOutput');
  expect(executed[0]).toContain('my-device');
});
