const { ipcRenderer } = require('electron');
let viewIndex = null;
let currentAudio = 'default';

ipcRenderer.on('init', (_e, data) => {
  viewIndex = data.index;
  document.getElementById('profileName').value = data.name || '';
  fillProfiles(data.profiles, data.currentProfile);
  fillControllers(data.controllers, data.currentController);
  currentAudio = data.currentAudio || 'default';
  enumerateAudio();
});

function fillProfiles(profiles, current) {
  const select = document.getElementById('profileSelect');
  select.innerHTML = '';
  Object.entries(profiles).forEach(([id, name]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name;
    if (id === current) opt.selected = true;
    select.appendChild(opt);
  });
}

function fillControllers(controllers, current) {
  const select = document.getElementById('controllerSelect');
  select.innerHTML = '';
  controllers.forEach(idx => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `Controller ${idx}`;
    if (idx === current) opt.selected = true;
    select.appendChild(opt);
  });
}

function fillAudio(devices) {
  const select = document.getElementById('audioSelect');
  select.innerHTML = '';
  const def = document.createElement('option');
  def.value = 'default';
  def.textContent = 'Default';
  if (!currentAudio || currentAudio === 'default') def.selected = true;
  select.appendChild(def);
  devices.forEach(dev => {
    const opt = document.createElement('option');
    opt.value = dev.deviceId;
    opt.textContent = dev.label;
    if (dev.deviceId === currentAudio) opt.selected = true;
    select.appendChild(opt);
  });
}

async function enumerateAudio() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    fillAudio(devices.filter(d => d.kind === 'audiooutput'));
  } catch {
    fillAudio([]);
  }
}

document.getElementById('saveName').addEventListener('click', () => {
  ipcRenderer.send('rename-profile', { index: viewIndex, name: document.getElementById('profileName').value });
});

document.getElementById('applyProfile').addEventListener('click', () => {
  ipcRenderer.send('select-profile', { index: viewIndex, profileId: document.getElementById('profileSelect').value });
});

document.getElementById('applyController').addEventListener('click', () => {
  ipcRenderer.send('select-controller', { index: viewIndex, controller: parseInt(document.getElementById('controllerSelect').value, 10) });
});

document.getElementById('applyAudio').addEventListener('click', () => {
  ipcRenderer.send('select-audio', { index: viewIndex, deviceId: document.getElementById('audioSelect').value });
});

document.getElementById('newProfile').addEventListener('click', () => {
  ipcRenderer.send('create-profile', { index: viewIndex, name: document.getElementById('profileName').value });
});

document.getElementById('closeBtn').addEventListener('click', () => {
  ipcRenderer.send('close-config', { index: viewIndex });
});

ipcRenderer.send('config-ready');
