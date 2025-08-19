const { destroyView } = require('../lib/view-utils');

test('destroyView removes view and destroys its contents', () => {
  const win = { removeBrowserView: jest.fn() };
  const webContents = { destroy: jest.fn() };
  const view = { webContents, destroy: jest.fn() };

  destroyView(win, view);

  expect(win.removeBrowserView).toHaveBeenCalledWith(view);
  expect(webContents.destroy).toHaveBeenCalled();
  expect(view.destroy).toHaveBeenCalled();
});

