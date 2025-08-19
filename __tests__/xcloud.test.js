const { isXboxHost, getGamepadPatch } = require('../lib/xcloud');

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
