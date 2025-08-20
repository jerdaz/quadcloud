const vm = require('vm');
const { JSDOM } = require('jsdom');
const { buildAudioSinkScript } = require('../lib/audio-output');

describe('buildAudioSinkScript', () => {
  test('sets sink id on existing and new media elements', async () => {
    const dom = new JSDOM(`<!DOCTYPE html><body></body>`, { runScripts: 'outside-only' });
    const { window } = dom;
    window.navigator.mediaDevices = { selectAudioOutput: jest.fn().mockResolvedValue() };

    const audio1 = window.document.createElement('audio');
    audio1.setSinkId = jest.fn().mockResolvedValue();
    window.document.body.appendChild(audio1);

    const script = buildAudioSinkScript('dev123');
    const result = vm.runInContext(script, dom.getInternalVMContext());
    await result;

    expect(window.navigator.mediaDevices.selectAudioOutput).toHaveBeenCalledWith({ deviceId: 'dev123' });
    expect(audio1.setSinkId).toHaveBeenCalledWith('dev123');

    const audio2 = window.document.createElement('audio');
    audio2.setSinkId = jest.fn().mockResolvedValue();
    window.document.body.appendChild(audio2);

    await new Promise(r => setTimeout(r, 0));

    expect(audio2.setSinkId).toHaveBeenCalledWith('dev123');
  });
});
