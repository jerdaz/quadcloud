const { ipcRenderer } = require('electron');
let hideCursorTimeout;

function resetCursorTimeout() {
  const body = document.body;
  if (!body) return;
  body.style.cursor = '';
  clearTimeout(hideCursorTimeout);
  hideCursorTimeout = setTimeout(() => {
    body.style.cursor = 'none';
  }, 5000);
}

window.addEventListener('mousemove', resetCursorTimeout);
window.addEventListener('mousedown', resetCursorTimeout);
window.addEventListener('keydown', resetCursorTimeout);

window.addEventListener('DOMContentLoaded', () => {
  resetCursorTimeout();
});

ipcRenderer.on('set-audio-device', (_e, deviceId) => {
  const apply = () => {
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
      if (typeof v.setSinkId === 'function') {
        try { v.setSinkId(deviceId); } catch {}
      }
    });
  };
  apply();
  const mo = new MutationObserver(apply);
  mo.observe(document, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 10000);
});
