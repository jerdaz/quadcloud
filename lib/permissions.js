const { XBOX_HOST_RE } = require('./xcloud');

const MEDIA_PERMS = new Set([
  'media',
  'audioCapture',
  'videoCapture',
  'speaker-selection',
  'speakerSelection'
]);

function isAllowed(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    return XBOX_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

function allowMediaPermissions(ses) {
  if (!ses) return;

  ses.setPermissionCheckHandler((wc, permission, requestingOrigin, details) => {
    const url = requestingOrigin || details?.requestingUrl || wc?.getURL() || '';
    if (!isAllowed(url)) return false;
    return MEDIA_PERMS.has(permission);
  });

  ses.setPermissionRequestHandler((wc, permission, callback, details = {}) => {
    const url = details.requestingUrl || wc?.getURL() || '';
    const allowed = isAllowed(url) && MEDIA_PERMS.has(permission);
    if (allowed && permission === 'media') {
      const hasVideo = Array.isArray(details.mediaTypes) && details.mediaTypes.includes('video');
      callback(!hasVideo);
    } else {
      callback(allowed);
    }
  });
}

module.exports = { allowMediaPermissions };
