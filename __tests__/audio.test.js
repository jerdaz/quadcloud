const { getAudioSinkPatch } = require('../lib/audio');

describe('getAudioSinkPatch', () => {
  test('includes device id and setSinkId calls', () => {
    const id = 'dev123';
    const patch = getAudioSinkPatch(id);
    expect(patch).toContain(id);
    expect(patch).toMatch(/setSinkId/);
    expect(patch).toMatch(/AudioContext/);
    expect(patch).toMatch(/window\.Audio/);
  });
});
