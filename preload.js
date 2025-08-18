(function () {
  // Determine controller slot passed from main process
  let slot = 0;
  try {
    const arg = (process.argv || []).find(a => a.startsWith('--controllerSlot='));
    if (arg) slot = Number(arg.split('=')[1]);
  } catch {}

  // Remember controller ID to avoid index shifting
  let pairedId;
  try {
    pairedId = window.localStorage.getItem('controllerId');
  } catch {}

  const nativeGetGamepads = navigator.getGamepads.bind(navigator);

  function filteredPads() {
    const pads = Array.from(nativeGetGamepads());
    let chosen = null;

    if (pairedId) {
      chosen = pads.find(p => p && p.id === pairedId) || null;
    } else {
      // fallback to slot index until a button press pairs the controller
      chosen = pads[slot] || null;
      if (!pairedId && chosen && chosen.buttons.some(b => b.pressed)) {
        pairedId = chosen.id;
        try { window.localStorage.setItem('controllerId', pairedId); } catch {}
      }
    }

    const arr = new Array(Math.max(4, pads.length)).fill(null);
    if (chosen) {
      const prox = new Proxy(chosen, {
        get(t, p) { return p === 'index' ? 0 : t[p]; }
      });
      arr[0] = prox;
    }
    return arr;
  }

  try {
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: false,
      enumerable: true,
      value: () => filteredPads()
    });
  } catch {}

  const origAdd = window.addEventListener.bind(window);
  window.addEventListener = function (type, listener, opts) {
    if (type === 'gamepadconnected' || type === 'gamepaddisconnected') {
      const wrapped = (ev) => {
        const id = ev && ev.gamepad && ev.gamepad.id;
        if (pairedId && id !== pairedId) return;
        if (!pairedId && ev.gamepad) {
          pairedId = ev.gamepad.id;
          try { window.localStorage.setItem('controllerId', pairedId); } catch {}
        }
        const prox = new Proxy(ev, {
          get(t, p) {
            if (p === 'gamepad') {
              return new Proxy(ev.gamepad, {
                get(tt, pp) { return pp === 'index' ? 0 : tt[pp]; }
              });
            }
            return t[p];
          }
        });
        listener(prox);
      };
      return origAdd(type, wrapped, opts);
    }
    return origAdd(type, listener, opts);
  };

  // Cursor hiding logic
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
  window.addEventListener('DOMContentLoaded', resetCursorTimeout);
})();

