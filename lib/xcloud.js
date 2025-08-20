const XBOX_HOST_RE = /(^|\.)xbox\.com$/i;

function isXboxHost(host) {
  return XBOX_HOST_RE.test(host);
}

function getGamepadPatch(index) {
  return `
(() => {
  const myIndex = ${index};
  if (window.__gamepadIsolationPatched === myIndex) return;
  window.__gamepadIsolationPatched = myIndex;

  const nativeGetGamepads = navigator.__nativeGetGamepads || navigator.getGamepads.bind(navigator);
  if (!navigator.__nativeGetGamepads) navigator.__nativeGetGamepads = nativeGetGamepads;

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

  const filterEvent = ev => {
    if (ev.gamepad.index !== myIndex) {
      ev.stopImmediatePropagation();
    } else {
      try { Object.defineProperty(ev.gamepad, 'index', { value: 0 }); } catch {}
    }
  };
  window.addEventListener('gamepadconnected', filterEvent, true);
  window.addEventListener('gamepaddisconnected', filterEvent, true);

  const existing = nativeGetGamepads()[myIndex];
  if (existing) {
    try {
      Object.defineProperty(existing, 'index', { value: 0 });
      const evt = new Event('gamepadconnected');
      Object.defineProperty(evt, 'gamepad', { value: existing });
      window.dispatchEvent(evt);
    } catch {}
  }
})()`;
}

function getControllerSlot(id) {
  if (typeof id !== 'string') return null;
  const match = /^Xbox Controller(?:\s*(\d))?$/i.exec(id.trim());
  if (!match) return null;
  const num = match[1] ? parseInt(match[1], 10) : 1;
  return num - 1;
}

module.exports = {
  XBOX_HOST_RE,
  isXboxHost,
  getGamepadPatch,
  getControllerSlot
};
