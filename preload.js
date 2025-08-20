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

function reportPad(pad) {
  if (pad && pad.id) {
    ipcRenderer.send('gamepad-connected', { id: pad.id, index: pad.index });
  }
}

function scanPads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) reportPad(pad);
}

window.addEventListener('gamepadconnected', e => reportPad(e.gamepad));

window.addEventListener('mousemove', resetCursorTimeout);
window.addEventListener('mousedown', resetCursorTimeout);
window.addEventListener('keydown', resetCursorTimeout);

window.addEventListener('DOMContentLoaded', () => {
  resetCursorTimeout();
  scanPads();
});

setInterval(scanPads, 3000);
