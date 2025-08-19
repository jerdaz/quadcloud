const { closeConfigView } = require('../lib/view-utils');

test('closeConfigView removes config view and clears slot', () => {
  const win = { removeBrowserView: jest.fn() };
  const cfg = {};
  const configViews = [cfg];

  closeConfigView(win, configViews, 0);

  expect(win.removeBrowserView).toHaveBeenCalledWith(cfg);
  expect(configViews[0]).toBeUndefined();
});
