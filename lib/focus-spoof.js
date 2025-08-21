function applyXcloudFocusPatch(hostname) {
  try {
    const host = (hostname || (location && location.hostname) || '').toLowerCase();
    const isXcloud = /(^|\.)((xbox|xboxlive)\.com|cloudgaming|cloudapp|azureedge)\./.test(host) || /xbox\.com$/.test(host);
    if (!isXcloud) return;

    const docProto = Document.prototype;
    try { Object.defineProperty(docProto, 'hidden', { configurable: true, get: () => false }); } catch {}
    try { Object.defineProperty(docProto, 'webkitHidden', { configurable: true, get: () => false }); } catch {}
    try { Object.defineProperty(docProto, 'visibilityState', { configurable: true, get: () => 'visible' }); } catch {}
    try { Object.defineProperty(docProto, 'hasFocus', { configurable: true, value: () => true }); } catch {}

    const nativeAdd = EventTarget.prototype.addEventListener;
    window.addEventListener = function (type, listener, opts) {
      if (type === 'blur' || type === 'visibilitychange') {
        return nativeAdd.call(this, type, () => {}, opts);
      }
      return nativeAdd.call(this, type, listener, opts);
    };
    Document.prototype.addEventListener = function (type, listener, opts) {
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
  } catch {}
}

module.exports = { applyXcloudFocusPatch };
