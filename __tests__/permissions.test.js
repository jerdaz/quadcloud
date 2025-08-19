const { allowMediaPermissions } = require('../lib/permissions');

test('allowMediaPermissions approves media-related permissions', () => {
  let handler;
  const ses = {
    setPermissionRequestHandler: fn => { handler = fn; }
  };
  allowMediaPermissions(ses);
  const results = {};
  const perms = ['media', 'audioCapture', 'videoCapture', 'speakerSelection', 'geolocation'];
  perms.forEach(p => {
    handler(null, p, decision => { results[p] = decision; });
  });
  expect(results.media).toBe(true);
  expect(results.audioCapture).toBe(true);
  expect(results.videoCapture).toBe(true);
  expect(results.speakerSelection).toBe(true);
  expect(results.geolocation).toBe(false);
});
