const { FOCUS_SPOOF_SOURCE } = require('./lib/focus-spoof');

// Inject focus/visibility spoof into the main world at document_start
(function injectFocusSpoof() {
  try {
    const script = document.createElement('script');
    script.textContent = FOCUS_SPOOF_SOURCE;
    (document.documentElement || document.head).appendChild(script);
    script.remove();
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
