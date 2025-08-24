const fs = require('fs');
const path = require('path');

describe('XFOCUS_PATCH overlay', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  test('includes gp-active class', () => {
    expect(src).toContain('gp-active');
  });

  test('patches HTMLElement.prototype.focus', () => {
    expect(src).toMatch(/HTMLElement\.prototype\.focus/);
  });
});
