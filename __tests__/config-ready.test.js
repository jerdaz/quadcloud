const sender = {};
const configViews = [undefined, { webContents: sender }, undefined];

describe('config-ready lookup', () => {
  test('ignores empty slots', () => {
    const index = configViews.findIndex(cv => cv && cv.webContents === sender);
    expect(index).toBe(1);
  });
});
