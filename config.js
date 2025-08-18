const quadrantNames = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];
let currentConfig;

async function load() {
  currentConfig = await window.electronAPI.getConfig();
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter(d => d.kind === 'audiooutput');
  const container = document.getElementById('quadrants');
  container.innerHTML = '';
  quadrantNames.forEach((name, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'quadrant';
    const h = document.createElement('h2');
    h.textContent = name;
    wrapper.appendChild(h);

    const audioLabel = document.createElement('label');
    audioLabel.textContent = 'Audio output:';
    const audioSelect = document.createElement('select');
    const defaultOpt = document.createElement('option');
    defaultOpt.value = 'default';
    defaultOpt.textContent = 'Default';
    audioSelect.appendChild(defaultOpt);
    outputs.forEach(dev => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || dev.deviceId;
      audioSelect.appendChild(opt);
    });
    audioSelect.value = currentConfig.audioOutputs[i] || 'default';
    audioSelect.addEventListener('change', () => {
      window.electronAPI.setAudioOutput(i, audioSelect.value);
    });
    audioLabel.appendChild(audioSelect);
    wrapper.appendChild(audioLabel);

    const ctrlLabel = document.createElement('label');
    ctrlLabel.textContent = 'Controller:';
    const ctrlSelect = document.createElement('select');
    for (let c = 0; c < 4; c++) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `Controller ${c + 1}`;
      ctrlSelect.appendChild(opt);
    }
    ctrlSelect.value = currentConfig.controllerMapping[i];
    ctrlSelect.addEventListener('change', () => {
      window.electronAPI.setController(i, parseInt(ctrlSelect.value, 10)).then(load);
    });
    ctrlLabel.appendChild(ctrlSelect);
    wrapper.appendChild(ctrlLabel);

    const detectBtn = document.createElement('button');
    detectBtn.textContent = 'Press a key';
    detectBtn.addEventListener('click', () => detectController(i));
    wrapper.appendChild(detectBtn);

    container.appendChild(wrapper);
  });
}

function detectController(viewIndex) {
  const start = performance.now();
  function poll() {
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (!pad) continue;
      if (pad.buttons.some(b => b.pressed)) {
        window.electronAPI.setController(viewIndex, pad.index).then(load);
        return;
      }
    }
    if (performance.now() - start < 5000) {
      requestAnimationFrame(poll);
    }
  }
  requestAnimationFrame(poll);
}

load();
