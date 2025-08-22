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

function getFocusPatch() {
  return `
(() => {
  if (window.__quadFocusSpoof) return;
  window.__quadFocusSpoof = true;
  const docProto = Document.prototype;
  try { Object.defineProperty(docProto, 'hidden', { configurable: true, get(){ return false; } }); } catch {}
  try { Object.defineProperty(docProto, 'webkitHidden', { configurable: true, get(){ return false; } }); } catch {}
  try { Object.defineProperty(docProto, 'visibilityState', { configurable: true, get(){ return 'visible'; } }); } catch {}
  try {
    Object.defineProperty(docProto, 'hasFocus', {
      configurable: true,
      value: function(){ return true; }
    });
  } catch {}

  const nativeAdd = EventTarget.prototype.addEventListener;
  window.addEventListener = function(type, listener, opts){
    if (type === 'blur' || type === 'visibilitychange') {
      return nativeAdd.call(this, type, () => {}, opts);
    }
    return nativeAdd.call(this, type, listener, opts);
  };

  Document.prototype.addEventListener = function(type, listener, opts){
    if (type === 'visibilitychange') {
      return nativeAdd.call(this, type, () => {}, opts);
    }
    return nativeAdd.call(this, type, listener, opts);
  };

  const fireFocus = () => {
    try { window.dispatchEvent(new Event('focus')); } catch {}
    try { document.dispatchEvent(new Event('focus')); } catch {}
  };
  fireFocus();
  setInterval(fireFocus, 4000);

  const tryDismiss = () => {
    const sel = 'button,[role=button],[data-testid*="activate" i],[aria-label*="activate" i],[aria-label*="focus" i]';
    for (const el of document.querySelectorAll(sel)) {
      const t = (el.innerText || el.textContent || '').toLowerCase();
      if (/(click|klik).*here|hier|activate|activeren|focus/.test(t)) {
        try { el.click(); return; } catch {}
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryDismiss, { once:true });
  } else {
    tryDismiss();
  }

  const tgt = document.documentElement || document.body;
  if (tgt) new MutationObserver(tryDismiss).observe(tgt, { childList:true, subtree:true });
})()
`;
}

module.exports = {
  XBOX_HOST_RE,
  isXboxHost,
  getGamepadPatch,
  getFocusPatch
};
