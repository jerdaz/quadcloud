const params = new URLSearchParams(global.process.argv.slice(1).join('&'));
const myIndex = Number(params.get('controllerIndex') || 0);

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
