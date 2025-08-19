const fs = require('fs');
const os = require('os');
const path = require('path');
const ProfileStore = require('../lib/profile-store');

describe('ProfileStore', () => {
  test('creates and assigns profiles with persistence', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'profiles-'));
    const file = path.join(tmp, 'profiles.json');
    const store1 = new ProfileStore(file);
    const id = store1.createProfile('Player');
    store1.assignProfile(0, id);
    store1.assignController(0, 2);
    store1.assignAudio(0, 'device1');

    const store2 = new ProfileStore(file);
    expect(store2.getProfiles()[id]).toBe('Player');
    expect(store2.getAssignment(0)).toBe(id);
    expect(store2.getController(0)).toBe(2);
    expect(store2.getAudio(0)).toBe('device1');
  });

  test('allows creating more than four profiles', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'profiles-'));
    const file = path.join(tmp, 'profiles.json');
    const store1 = new ProfileStore(file);
    for (let i = 0; i < 6; i++) {
      store1.createProfile(`P${i}`);
    }

    const store2 = new ProfileStore(file);
    expect(Object.keys(store2.getProfiles())).toHaveLength(6);
  });

});
