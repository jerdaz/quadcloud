const { overrideAudioSink } = require('../lib/audio-utils');

describe('overrideAudioSink', () => {
  test('executes JS with sinkId', () => {
    const wc = { executeJavaScript: jest.fn() };
    overrideAudioSink(wc, 'device1');
    expect(wc.executeJavaScript).toHaveBeenCalled();
    const script = wc.executeJavaScript.mock.calls[0][0];
    expect(script).toContain('device1');
  });

  test('skips when missing params', () => {
    const wc = { executeJavaScript: jest.fn() };
    overrideAudioSink(null, 'id');
    overrideAudioSink(wc, null);
    expect(wc.executeJavaScript).not.toHaveBeenCalled();
  });
});
