const { ipcRenderer } = require('electron');
const myIndex = ipcRenderer.sendSync('get-controller-index');

const nativeGetGamepads = navigator.getGamepads.bind(navigator);

navigator.getGamepads = () => {
  const gamepads = nativeGetGamepads();
  const result = [null, null, null, null];
  const pad = gamepads[myIndex];
  if (pad) {
    const proxied = new Proxy(pad, {
      get(target, prop) {
        return prop === 'index' ? 0 : target[prop];
      }
    });
    result[0] = proxied;
  }
  return result;
};

window.addEventListener('gamepadconnected', ev => {
  if (ev.gamepad.index !== myIndex) {
    ev.stopImmediatePropagation();
  } else {
    try { Object.defineProperty(ev.gamepad, 'index', { value: 0 }); } catch {}
  }
});

window.addEventListener('gamepaddisconnected', ev => {
  if (ev.gamepad.index !== myIndex) {
    ev.stopImmediatePropagation();
  } else {
    try { Object.defineProperty(ev.gamepad, 'index', { value: 0 }); } catch {}
  }
});

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
