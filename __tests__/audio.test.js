const { applyAudioOutput, allowSpeakerSelection } = require('../lib/audio');

describe('audio utils', () => {
  test('applyAudioOutput uses native API when available', () => {
    let usedId = null;
    const wc = { setAudioOutputDeviceId: id => { usedId = id; } };
    applyAudioOutput(wc, 'dev123');
    expect(usedId).toBe('dev123');
  });

  test('applyAudioOutput falls back to sink script', () => {
    const scripts = [];
    const wc = { executeJavaScript: s => { scripts.push(s); } };
    applyAudioOutput(wc, 'dev123');
    expect(scripts[0]).toContain("setSinkId('dev123')");
  });

  test('allowSpeakerSelection grants permission', () => {
    let reqHandler; let checkHandler;
    const ses = {
      setPermissionRequestHandler: fn => { reqHandler = fn; },
      setPermissionCheckHandler: fn => { checkHandler = fn; }
    };
    allowSpeakerSelection(ses);
    let granted = false;
    reqHandler(null, 'speaker-selection', g => { granted = g; });
    expect(granted).toBe(true);
    expect(checkHandler(null, 'speaker-selection')).toBe(true);
  });
});
