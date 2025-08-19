const { applyAudioOutput, allowSpeakerSelection } = require('../lib/audio');

describe('audio utils', () => {
  test('applyAudioOutput injects sink override script', () => {
    const scripts = [];
    const wc = { executeJavaScript: s => { scripts.push(s); } };
    applyAudioOutput(wc, "dev'123");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain("window.__audioSink = 'dev\\'123'");
    expect(scripts[0]).toContain('setSinkId');
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
