const { ipcRenderer } = require('electron');
const { getControllerIndexFromLabel } = require('./lib/controller-audio');

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

function detectControllerAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then(devices => {
    devices.forEach(device => {
      if (device.kind === 'audiooutput') {
        const idx = getControllerIndexFromLabel(device.label || '');
        if (idx !== null) {
          ipcRenderer.send('controller-audio-device', { controllerIndex: idx, deviceId: device.deviceId });
        }
      }
    });
  }).catch(() => {});
}

if (navigator.mediaDevices) {
  navigator.mediaDevices.addEventListener('devicechange', detectControllerAudioDevices);
}

window.addEventListener('mousemove', resetCursorTimeout);
window.addEventListener('mousedown', resetCursorTimeout);
window.addEventListener('keydown', resetCursorTimeout);

window.addEventListener('DOMContentLoaded', () => {
  resetCursorTimeout();
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      stream.getTracks().forEach(t => t.stop());
    }).catch(() => {}).finally(detectControllerAudioDevices);
  } else {
    detectControllerAudioDevices();
  }
});
