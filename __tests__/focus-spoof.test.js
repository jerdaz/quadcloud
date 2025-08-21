/**
 * @jest-environment jsdom
 */
const vm = require('vm');
const { focusSpoof } = require('../lib/focus-spoof');

describe('focusSpoof', () => {
  const origDescriptors = {
    hidden: Object.getOwnPropertyDescriptor(Document.prototype, 'hidden'),
    visibilityState: Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState'),
    hasFocus: document.hasFocus,
  };
  const restore = () => {
    if (origDescriptors.hidden) Object.defineProperty(Document.prototype, 'hidden', origDescriptors.hidden);
    if (origDescriptors.visibilityState) Object.defineProperty(Document.prototype, 'visibilityState', origDescriptors.visibilityState);
    if (origDescriptors.hasFocus) document.hasFocus = origDescriptors.hasFocus;
    window.addEventListener = EventTarget.prototype.addEventListener;
    Document.prototype.addEventListener = EventTarget.prototype.addEventListener;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    restore();
  });

  function runWithHost(host) {
    const context = {
      location: { hostname: host },
      Document,
      document,
      window,
      EventTarget,
      MutationObserver,
      setInterval,
      setTimeout,
      console
    };
    vm.runInNewContext(`(${focusSpoof.toString()})();`, context);
  }

  test('patches focus APIs on xbox hosts', () => {
    runWithHost('xbox.com');
    expect(document.hidden).toBe(false);
    expect(document.visibilityState).toBe('visible');
    expect(document.hasFocus()).toBe(true);
  });

  test('does nothing on other hosts', () => {
    const hidden = document.hidden;
    const vis = document.visibilityState;
    runWithHost('example.com');
    expect(document.hidden).toBe(hidden);
    expect(document.visibilityState).toBe(vis);
  });
});
