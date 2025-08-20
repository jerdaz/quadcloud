const { XBOX_HOST_RE } = require('./xcloud');

function addCspHeaders(url, existing = {}) {
  const headers = { ...existing };
  try {
    const host = new URL(url).hostname;
    if (XBOX_HOST_RE.test(host)) {
      headers['Content-Security-Policy'] = headers['Content-Security-Policy'] || ["default-src 'self'"];
      headers['Permissions-Policy'] = headers['Permissions-Policy'] || ["microphone=(self), speaker-selection=(self)"];
    }
  } catch {
    // ignore invalid URLs
  }
  return headers;
}

module.exports = { addCspHeaders };
