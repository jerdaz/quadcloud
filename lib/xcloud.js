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

function getAudioSinkPatch(deviceId) {
  const id = JSON.stringify(deviceId);
  return `
(() => {
  const sinkId = ${id};
  const tryApply = () => {
    const root = document.querySelector('xcloud-streamer') || document;
    const el = root.querySelector ? root.querySelector('audio,video') : null;
    if (el && typeof el.setSinkId === 'function') {
      el.setSinkId(sinkId).catch(() => {});
      return true;
    }
    return false;
  };
  if (!tryApply()) {
    const mo = new MutationObserver(() => { if (tryApply()) mo.disconnect(); });
    mo.observe(document, { childList: true, subtree: true });
  }
})()`;
}

module.exports = {
  XBOX_HOST_RE,
  isXboxHost,
  getGamepadPatch,
  getAudioSinkPatch
};
