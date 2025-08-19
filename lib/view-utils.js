function destroyView(win, view) {
  try { win.removeBrowserView(view); } catch {}
  try { if (typeof view.destroy === 'function') view.destroy(); } catch {}
}

/**
 * Robust audio routing: apply after attach and re-apply on navigation or media start.
 */
function attachViewWithAudio(win, view, deviceId, { platform = process.platform } = {}) {
  win.addBrowserView(view);

  if (!deviceId) return;
  if (platform === 'linux') return; // not supported on Linux

  const wc = view.webContents;

  if (typeof wc.setAudioOutputDevice !== 'function') {
    console.warn('[QC Audio] setAudioOutputDevice unsupported');
    return;
  }

  async function apply(label = 'initial') {
    try {
      if (!deviceId) return;
      await wc.setAudioOutputDevice(deviceId);
      console.log('[QC Audio]', label, '->', deviceId, 'ok');
    } catch (e) {
      console.warn('[QC Audio]', label, '->', deviceId, 'failed:', e?.message || e);
      if (deviceId !== 'default') {
        try {
          await wc.setAudioOutputDevice('default');
          console.log('[QC Audio]', label, 'fallback-default ok');
          deviceId = 'default';
        } catch (e2) {
          console.warn('[QC Audio]', label, 'fallback-default failed:', e2?.message || e2);
        }
      }
    }
  }

  // 1) immediately after attach
  apply('after-attach');

  // 2) re-apply on navigation (main + subframes)
  const reapplyNav = () => apply('nav');
  wc.on('did-start-navigation', reapplyNav);
  wc.on('did-frame-navigate', reapplyNav);

  // 3) when media actually starts playing (WebRTC/player init)
  wc.on('media-started-playing', () => apply('media-started-playing'));

  // 4) extra guard after load
  wc.on('did-stop-loading', () => apply('did-stop-loading'));

  // 5) small retry backoff for race conditions
  let retries = 4;
  const iv = setInterval(() => {
    apply('retry-' + (5 - retries));
    if (--retries <= 0) clearInterval(iv);
  }, 500);
}

module.exports = { destroyView, attachViewWithAudio };
