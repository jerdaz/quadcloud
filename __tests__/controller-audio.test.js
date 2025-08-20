const { getControllerIndexFromLabel } = require('../lib/controller-audio');

describe('getControllerIndexFromLabel', () => {
  test('maps default Xbox Controller to index 0', () => {
    expect(getControllerIndexFromLabel('Xbox Controller')).toBe(0);
  });

  test('maps numbered controllers correctly', () => {
    expect(getControllerIndexFromLabel('Xbox Controller 2')).toBe(1);
    expect(getControllerIndexFromLabel('Xbox Controller 3')).toBe(2);
    expect(getControllerIndexFromLabel('Xbox Controller 4')).toBe(3);
  });

  test('returns null for non-matching labels', () => {
    expect(getControllerIndexFromLabel('PlayStation Controller')).toBeNull();
    expect(getControllerIndexFromLabel('Xbox Controller 5')).toBeNull();
  });
});
