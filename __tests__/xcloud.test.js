const { isXboxHost, getGamepadPatch, getFocusPatch } = require('../lib/xcloud');

describe('isXboxHost', () => {
  test('matches xbox.com and subdomains', () => {
    expect(isXboxHost('xbox.com')).toBe(true);
    expect(isXboxHost('sub.xbox.com')).toBe(true);
  });

  test('rejects non xbox hosts', () => {
    expect(isXboxHost('example.com')).toBe(false);
    expect(isXboxHost('xbox.example.com')).toBe(false);
  });
});

describe('getGamepadPatch', () => {
  test('includes provided controller index', () => {
    const patch = getGamepadPatch(2);
    expect(patch).toContain('const myIndex = 2;');
  });
});

describe('getFocusPatch', () => {
  test('spoofs focus-related properties', () => {
    const patch = getFocusPatch();
    expect(patch).toContain("document.dispatchEvent(new Event('focus'))");
    expect(patch).toContain('visibilityState');
  });
});
