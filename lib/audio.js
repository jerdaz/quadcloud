function applyAudioOutput(webContents, deviceId) {
  if (!webContents || !deviceId) return;
  const escaped = deviceId.replace(/'/g, "\\'");
  const script = `(() => {
    const vids = document.querySelectorAll('video');
    vids.forEach(v => {
      if (typeof v.setSinkId === 'function') {
        try { v.setSinkId('${escaped}'); } catch {}
      }
    });
  })()`;
  try { webContents.executeJavaScript(script, true); } catch {}
}

function allowSpeakerSelection(session) {
  if (!session) return;
  try {
    session.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));
    session.setPermissionCheckHandler((_wc, perm) => perm === 'speaker-selection');
  } catch {}
}

module.exports = { applyAudioOutput, allowSpeakerSelection };
