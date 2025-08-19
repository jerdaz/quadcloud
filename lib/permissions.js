function allowMediaPermissions(ses) {
  if (!ses) return;
  ses.setPermissionRequestHandler((wc, permission, callback) => {
    if (['media', 'audioCapture', 'videoCapture', 'speakerSelection'].includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

module.exports = { allowMediaPermissions };
