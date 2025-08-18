const arg = global.process.argv.find(a => a.startsWith('--controllerIndex='));
const myIndex = arg ? Number(arg.split('=')[1]) : 0;

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
