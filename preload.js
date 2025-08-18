// QuadCloud preload — per-kwadrant gamepad-isolatie + cursor-hider
(() => {
  // --- args ---------------------------------------------------------------
  const argv = (typeof process !== 'undefined' && Array.isArray(process.argv)) ? process.argv : [];
  const getArg = (name) => {
    const p = `--${name}=`;
    const hit = argv.find(a => typeof a === 'string' && a.startsWith(p));
    return hit ? hit.slice(p.length) : null;
  };

  let slot = 0; // 0..3 (0 = linksboven)
  const slotArg = getArg('controllerSlot');
  if (slotArg != null && !Number.isNaN(Number(slotArg))) slot = Number(slotArg);

  const pinnedId = getArg('controllerId'); // optioneel: exact gamepad.id

  // --- natives ------------------------------------------------------------
  const nativeGetGamepads = navigator.getGamepads.bind(navigator);
  const nativeAddEvent = window.addEventListener.bind(window);

  // --- helpers ------------------------------------------------------------
  function choosePad() {
    const pads = Array.from(nativeGetGamepads());
    if (pinnedId) {
      const byId = pads.find(p => p && p.id === pinnedId);
      if (byId) return byId;
      return null; // ID gevraagd maar (nog) niet aanwezig
    }
    return pads[slot] || null;
  }

  function proxyGamepad(gp) {
    if (!gp) return null;
    // Spoof index=0 zodat sites het altijd als eerste pad zien
    return new Proxy(gp, {
      get(target, prop, recv) {
        if (prop === 'index') return 0;
        return Reflect.get(target, prop, recv);
      }
    });
  }

  function filteredPadsArray() {
    const chosen = choosePad();
    const out = [null, null, null, null];
    if (chosen) out[0] = proxyGamepad(chosen);
    return out;
  }

  // --- override navigator.getGamepads ------------------------------------
  try {
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: false,
      enumerable: true,
      value: () => filteredPadsArray()
    });
  } catch {
    // fall back: no-op
  }

  // --- filter events naar alleen dit pad ----------------------------------
  window.addEventListener = function(type, listener, options) {
    if (type === 'gamepadconnected' || type === 'gamepaddisconnected') {
      const wrapped = (ev) => {
        const gp = ev && ev.gamepad;
        if (!gp) return;

        const match = pinnedId ? (gp.id === pinnedId) : (gp.index === slot);
        if (!match) return;

        // Spoof index=0 in het eventobject ook
        const proxEvent = new Proxy(ev, {
          get(t, p, r) {
            if (p === 'gamepad') return proxyGamepad(gp);
            return Reflect.get(t, p, r);
          }
        });
        try { listener(proxEvent); } catch (_) {}
      };
      return nativeAddEvent(type, wrapped, options);
    }
    return nativeAddEvent(type, listener, options);
  };

  // --- cursor hider -------------------------------------------------------
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
  nativeAddEvent('mousemove', resetCursorTimeout);
  nativeAddEvent('mousedown', resetCursorTimeout);
  nativeAddEvent('keydown', resetCursorTimeout);
  nativeAddEvent('DOMContentLoaded', resetCursorTimeout);

  // --- eenvoudige debug (F12 console) ------------------------------------
  // console.debug('[QuadCloud preload]', { slot, pinnedId });

})();
