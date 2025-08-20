const { setAudioOutput } = require('../lib/view-utils');

test('setAudioOutput executes script with sink id', async () => {
  const calls = [];
  const view = { webContents: { executeJavaScript: jest.fn(script => { calls.push(script); return Promise.resolve(); }) } };
  await setAudioOutput(view, 'device123');
  expect(view.webContents.executeJavaScript).toHaveBeenCalled();
  const script = calls[0];
  expect(script).toContain('selectAudioOutput');
  expect(script).toContain('setSinkId');
  expect(script).toContain('device123');
});
