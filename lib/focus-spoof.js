function focusSpoof() {
  try {
    const host = (location.hostname || '').toLowerCase();
    const isXcloud = /(^|\.)(xbox\.com|xboxlive\.com|cloudgaming|cloudapp|azureedge)\./.test(host) || /xbox\.com$/.test(host);
    if (!isXcloud) return;

    const docProto = Document.prototype;
    try { Object.defineProperty(docProto, 'hidden', { configurable: true, get() { return false; } }); } catch {}
    try { Object.defineProperty(docProto, 'webkitHidden', { configurable: true, get() { return false; } }); } catch {}
    try { Object.defineProperty(docProto, 'visibilityState', { configurable: true, get() { return 'visible'; } }); } catch {}
    try { Object.defineProperty(docProto, 'hasFocus', { configurable: true, value() { return true; } }); } catch {}

    const nativeAdd = EventTarget.prototype.addEventListener;
    window.addEventListener = function(type, listener, opts) {
      if (type === 'blur' || type === 'visibilitychange') {
        return nativeAdd.call(this, type, () => {}, opts);
      }
      return nativeAdd.call(this, type, listener, opts);
    };
    Document.prototype.addEventListener = function(type, listener, opts) {
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
      document.addEventListener('DOMContentLoaded', tryDismiss, { once: true });
    } else {
      tryDismiss();
    }
    const tgt = document.documentElement || document.body;
    if (tgt) new MutationObserver(tryDismiss).observe(tgt, { childList: true, subtree: true });

    setTimeout(() => {
      try {
        console.debug('[QC FocusSpoof]', location.href, { hidden: document.hidden, vs: document.visibilityState, hasFocus: document.hasFocus() });
      } catch {}
    }, 150);
  } catch {}
}

const FOCUS_SPOOF_SOURCE = `(${focusSpoof.toString()})();`;

module.exports = { focusSpoof, FOCUS_SPOOF_SOURCE };
