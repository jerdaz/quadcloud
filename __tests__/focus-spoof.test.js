/** @jest-environment jsdom */
const { applyXcloudFocusPatch } = require('../lib/focus-spoof');

test('forces focus visibility on xbox hosts', () => {
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => true });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => 'hidden' });
  Document.prototype.hasFocus = () => false;

  jest.useFakeTimers();
  applyXcloudFocusPatch('xbox.com');

  expect(document.hidden).toBe(false);
  expect(document.visibilityState).toBe('visible');
  expect(document.hasFocus()).toBe(true);

  const handler = jest.fn();
  window.addEventListener('blur', handler);
  window.dispatchEvent(new Event('blur'));
  expect(handler).not.toHaveBeenCalled();

  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
