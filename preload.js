const args = global.process.argv;
const indexArg = args.find(a => a.startsWith('--controllerIndex='));
const myIndex = indexArg ? Number(indexArg.split('=')[1]) : 0;
const spoofArg = args.find(a => a.startsWith('--spoofFocus='));
const spoofFocus = spoofArg ? spoofArg.split('=')[1] === 'true' : false;

if (spoofFocus) {
  const { webFrame } = require('electron');
  const patchCode = `
    (function () {
      const docProto = Document.prototype;
      const winProto = Window.prototype;

      try { Object.defineProperty(docProto, 'hidden', { configurable: true, get() { return false; } }); } catch {}
      try { Object.defineProperty(docProto, 'webkitHidden', { configurable: true, get() { return false; } }); } catch {}
      try { Object.defineProperty(docProto, 'visibilityState', { configurable: true, get() { return 'visible'; } }); } catch {}

      try {
        Object.defineProperty(docProto, 'hasFocus', {
          configurable: true,
          value: function () { return true; }
        });
      } catch {}

      const origAddEvent = window.addEventListener.bind(window);
      window.addEventListener = function (type, listener, options) {
        if (type === 'blur' || type === 'visibilitychange') {
          const wrapped = () => {};
          return origAddEvent(type, wrapped, options);
        }
        return origAddEvent(type, listener, options);
      };

      const origDocAdd = Document.prototype.addEventListener.bind(document);
      Document.prototype.addEventListener = function (type, listener, options) {
        if (type === 'visibilitychange') {
          const wrapped = () => {};
          return origDocAdd.call(this, type, wrapped, options);
        }
        return origDocAdd.call(this, type, listener, options);
      };

      const fireFocus = () => {
        try { window.dispatchEvent(new Event('focus')); } catch {}
        try { document.dispatchEvent(new Event('focus')); } catch {}
      };
      fireFocus();
      setInterval(fireFocus, 5000);

      function clickActivateButtons(root) {
        const sel = [
          'button',
          '[role=button]',
          '[data-testid*="activate" i]',
          '[aria-label*="activate" i]',
          '[aria-label*="focus" i]'
        ].join(',');
        const candidates = root.querySelectorAll(sel);
        for (const el of candidates) {
          const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
          if (!txt) continue;
          if (/(click|klik).*here|hier|activate|activeren|focus/.test(txt)) {
            try { el.click(); return true; } catch {}
          }
        }
        return false;
      }

      const tryDismiss = () => {
        try { clickActivateButtons(document); } catch {}
      };

      tryDismiss();
      const mo = new MutationObserver(() => tryDismiss());
      mo.observe(document.documentElement, { childList: true, subtree: true });
    })();
  `;

  try {
    webFrame.executeJavaScript(patchCode, true);
  } catch (e) {
    console.warn('[QuadCloud] visibility/focus patch failed', e);
  }
}

const nativeGetGamepads = navigator.getGamepads.bind(navigator);

navigator.getGamepads = () => {
  const gamepads = nativeGetGamepads();
  return [gamepads[myIndex] || null];
};

window.addEventListener('gamepadconnected', ev => {
  if (ev.gamepad.index !== myIndex) ev.stopImmediatePropagation();
});

window.addEventListener('gamepaddisconnected', ev => {
  if (ev.gamepad.index !== myIndex) ev.stopImmediatePropagation();
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
