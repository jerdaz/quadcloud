jest.mock('../lib/register-shortcuts', () => ({
  audioDialogJS: jest.fn(() => 'AUDIO_JS')
}));

const installAutoApplyCtrlA = require('../lib/auto-apply-ctrl-a');

test('applies ctrl-a script on media start and sets up mutation observer', () => {
  const callbacks = {};
  const wc = {
    on: jest.fn((evt, cb) => { callbacks[evt] = cb; }),
    executeJavaScript: jest.fn()
  };

  installAutoApplyCtrlA(wc, 0);

  expect(wc.on).toHaveBeenCalledWith('media-started-playing', expect.any(Function));
  expect(wc.on).toHaveBeenCalledWith('dom-ready', expect.any(Function));

  callbacks['media-started-playing']();
  expect(wc.executeJavaScript).toHaveBeenCalledWith('AUDIO_JS');

  wc.executeJavaScript.mockClear();
  callbacks['dom-ready']();
  const injected = wc.executeJavaScript.mock.calls[0][0];
  expect(injected).toContain('MutationObserver');
  expect(injected).toContain('AUDIO_JS');
  expect(injected).toContain('navigator.mediaDevices.addEventListener');
  expect(injected).toMatch(/apply\(\);/);
});
