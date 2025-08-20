const setMaxListeners = require('../lib/set-max-listeners');

test('sets max listeners on emitter', () => {
  const emitter = { setMaxListeners: jest.fn() };
  setMaxListeners(emitter, 42);
  expect(emitter.setMaxListeners).toHaveBeenCalledWith(42);
});

test('handles missing setMaxListeners gracefully', () => {
  const emitter = {};
  expect(() => setMaxListeners(emitter, 10)).not.toThrow();
});
