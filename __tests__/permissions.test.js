const { allowMediaPermissions } = require('../lib/permissions');

test('allowMediaPermissions wires handlers for allowed origins', () => {
  let checkHandler;
  let requestHandler;
  const ses = {
    setPermissionCheckHandler: fn => { checkHandler = fn; },
    setPermissionRequestHandler: fn => { requestHandler = fn; }
  };
  allowMediaPermissions(ses);

  const allowed = 'https://xbox.com/play';
  const denied = 'https://example.com/';

  // check handler tests
  expect(checkHandler({ getURL: () => allowed }, 'media', allowed, { requestingUrl: allowed })).toBe(true);
  expect(checkHandler({ getURL: () => allowed }, 'speaker-selection', allowed, { requestingUrl: allowed })).toBe(true);
  expect(checkHandler({ getURL: () => allowed }, 'geolocation', allowed, { requestingUrl: allowed })).toBe(false);
  expect(checkHandler({ getURL: () => denied }, 'media', denied, { requestingUrl: denied })).toBe(false);

  // request handler tests
  const results = {};
  requestHandler({ getURL: () => allowed }, 'media', r => { results.media = r; }, { requestingUrl: allowed, mediaTypes: ['audio'] });
  requestHandler({ getURL: () => allowed }, 'speaker-selection', r => { results.speaker = r; }, { requestingUrl: allowed });
  requestHandler({ getURL: () => denied }, 'media', r => { results.denied = r; }, { requestingUrl: denied, mediaTypes: ['audio'] });
  expect(results.media).toBe(true);
  expect(results.speaker).toBe(true);
  expect(results.denied).toBe(false);
});
