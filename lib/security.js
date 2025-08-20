const { XBOX_HOST_RE } = require('./xcloud');

function applySecurityHeaders(details) {
  const responseHeaders = { ...(details.responseHeaders || {}) };
  try {
    const { hostname } = new URL(details.url);
    if (XBOX_HOST_RE.test(hostname)) {
      responseHeaders['Content-Security-Policy'] = ["default-src 'self'"];
      responseHeaders['Permissions-Policy'] = ['microphone=*, speaker-selection=*'];
    }
  } catch {}
  return { responseHeaders };
}

module.exports = { applySecurityHeaders };
