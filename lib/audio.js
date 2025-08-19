function applyAudioOutput(webContents, deviceId) {
  if (!webContents || !deviceId) return;

  if (typeof webContents.setAudioOutputDeviceId === 'function') {
    try {
      webContents.setAudioOutputDeviceId(deviceId);
      return;
    } catch {
      // fall back to setSinkId
    }
  }

  const escaped = deviceId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const script = `(() => {
    function setAll() {
      document.querySelectorAll('video,audio').forEach(v => {
        if (typeof v.setSinkId === 'function') {
          v.setSinkId('${escaped}').catch(() => {});
        }
      });
    }
    setAll();
    if (!window.__sinkObserverAttached) {
      window.__sinkObserverAttached = true;
      const mo = new MutationObserver(() => setAll());
      mo.observe(document.documentElement, { childList: true, subtree: true });
      window.__sinkObserver = mo;
    }
  })()`;
  try { webContents.executeJavaScript(script, true); } catch {}
}

function allowSpeakerSelection(session) {
  if (!session) return;
  try {
    session.setPermissionRequestHandler((_wc, perm, cb) => {
      if (perm === 'speaker-selection') return cb(true);
      cb(false);
    });
    session.setPermissionCheckHandler((_wc, perm) => perm === 'speaker-selection');
  } catch {}
}

module.exports = { applyAudioOutput, allowSpeakerSelection };
