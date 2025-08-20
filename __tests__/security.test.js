const { applySecurityHeaders } = require('../lib/security');

describe('applySecurityHeaders', () => {
  test('adds headers for xbox hosts', () => {
    const details = { url: 'https://xbox.com/play', responseHeaders: {} };
    const { responseHeaders } = applySecurityHeaders(details);
    expect(responseHeaders['Content-Security-Policy']).toEqual(["default-src 'self'"]);
    expect(responseHeaders['Permissions-Policy']).toEqual(['microphone=*, speaker-selection=*']);
  });

  test('ignores non xbox hosts', () => {
    const details = { url: 'https://example.com', responseHeaders: {} };
    const { responseHeaders } = applySecurityHeaders(details);
    expect(responseHeaders['Content-Security-Policy']).toBeUndefined();
    expect(responseHeaders['Permissions-Policy']).toBeUndefined();
  });
});
