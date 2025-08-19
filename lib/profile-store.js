const fs = require('fs');

class ProfileStore {
  constructor(file) {
    this.file = file;
    this.data = { profiles: {}, assignments: [], controllers: [], audio: [] };
    this.load();
  }

  load() {
    try {
      const txt = fs.readFileSync(this.file, 'utf8');
      this.data = JSON.parse(txt);
    } catch {
      // keep defaults
    }
  }

  save() {
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  getProfiles() {
    return this.data.profiles;
  }

  createProfile(name) {
    const id = `profile${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
    this.data.profiles[id] = name || id;
    this.save();
    return id;
  }

  renameProfile(id, name) {
    if (this.data.profiles[id]) {
      this.data.profiles[id] = name;
      this.save();
    }
  }

  assignProfile(slot, id) {
    this.data.assignments[slot] = id;
    if (!this.data.profiles[id]) {
      this.data.profiles[id] = id;
    }
    this.save();
  }

  getAssignment(slot) {
    return this.data.assignments[slot];
  }

  assignController(slot, controller) {
    this.data.controllers[slot] = controller;
    this.save();
  }

  getController(slot) {
    return this.data.controllers[slot];
  }

  assignAudio(slot, deviceId) {
    this.data.audio[slot] = deviceId;
    this.save();
  }

  getAudio(slot) {
    return this.data.audio[slot];
  }

}

module.exports = ProfileStore;
