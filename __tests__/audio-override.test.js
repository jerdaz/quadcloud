const { setAudioSink } = require('../lib/view-utils');

test('setAudioSink executes script with sink id', () => {
  const wc = { executeJavaScript: jest.fn() };
  setAudioSink(wc, 'test-device');
  expect(wc.executeJavaScript).toHaveBeenCalled();
  const [script, userGesture] = wc.executeJavaScript.mock.calls[0];
  expect(script).toContain('test-device');
  expect(script).toContain('setSinkId');
  expect(userGesture).toBe(true);
});
