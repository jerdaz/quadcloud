const { getFocusPatch } = require('./lib/xcloud');

(function xcloudFocusPatch(){
  try {
    const host = (location.hostname || '').toLowerCase();
    const isXcloud = /(^|\.)(xbox\.com|xboxlive\.com|cloudgaming|cloudapp|azureedge)\./.test(host) || /xbox\.com$/.test(host);
    if (!isXcloud) return;
    const s = document.createElement('script');
    s.textContent = getFocusPatch();
    (document.documentElement || document.head).appendChild(s);
    s.remove();
  } catch {}
})();

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
