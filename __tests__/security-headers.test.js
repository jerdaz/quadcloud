const { addCspHeaders } = require('../lib/security-headers');

describe('addCspHeaders', () => {
  test('adds CSP and permissions policy for xbox hosts', () => {
    const headers = addCspHeaders('https://www.xbox.com/play', {});
    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['Permissions-Policy']).toEqual([
      'microphone=(self), speaker-selection=(self)'
    ]);
  });

  test('ignores non-xbox hosts', () => {
    const headers = addCspHeaders('https://example.com', {});
    expect(headers['Permissions-Policy']).toBeUndefined();
    expect(headers['Content-Security-Policy']).toBeUndefined();
  });
});
