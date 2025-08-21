const { app, globalShortcut, webContents } = require('electron');

function audioDialogJS(targetLabel, autoApply) {
  if (autoApply) {
    return `
(() => {
  navigator.mediaDevices.enumerateDevices().then(async devs => {
    const outputs = devs.filter(d => d.kind === 'audiooutput');
    const match = outputs.find(d => d.label && d.label.includes('${targetLabel}'));
    const id = match ? match.deviceId : null;
    if (!id) return;
    if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
      try { await navigator.mediaDevices.selectAudioOutput({ deviceId: id }); } catch {}
    }
    const els = document.querySelectorAll('audio, video');
    for (const el of els) {
      if (typeof el.setSinkId === 'function') {
        try { await el.setSinkId(id); } catch {}
      }
    }
  });
})();
`;
  }
  return `
(() => {
  const existing = document.getElementById('qc-audio-dialog');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'qc-audio-dialog';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '999999';

  const panel = document.createElement('div');
  panel.style.background = '#fff';
  panel.style.padding = '20px';
  panel.style.borderRadius = '8px';
  panel.style.color = '#000';

  const select = document.createElement('select');
  select.style.minWidth = '200px';

  const apply = document.createElement('button');
  apply.textContent = 'Apply';
  apply.style.marginLeft = '8px';

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.style.marginLeft = '8px';

  panel.appendChild(select);
  panel.appendChild(apply);
  panel.appendChild(cancel);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  navigator.mediaDevices.enumerateDevices().then(devs => {
    devs.filter(d => d.kind === 'audiooutput').forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || 'Device';
      if (d.label && d.label.includes('${targetLabel}')) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  });

  apply.addEventListener('click', async () => {
    const id = select.value;
    if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
      try { await navigator.mediaDevices.selectAudioOutput({ deviceId: id }); } catch {}
    }
    const els = document.querySelectorAll('audio, video');
    for (const el of els) {
      if (typeof el.setSinkId === 'function') {
        try { await el.setSinkId(id); } catch {}
      }
    }
    overlay.remove();
  });

  cancel.addEventListener('click', () => overlay.remove());
})();
`;
}

function applyAudioJS(deviceId) {
  return `
(async () => {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
      try { await navigator.mediaDevices.selectAudioOutput({ deviceId: '${deviceId}' }); } catch {}
    }
    const els = document.querySelectorAll('audio, video');
    for (const el of els) {
      if (typeof el.setSinkId === 'function') {
        try { await el.setSinkId('${deviceId}'); } catch {}
      }
    }
  } catch {}
})();
`;
}

function controllerLabel(controller) {
  return controller === 0 ? 'Xbox Controller' : `Xbox Controller ${controller + 1}`;
}

function registerShortcuts(views, toggleConfig, getController, getAudio) {
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });

  globalShortcut.register('CommandOrControl+Alt+I', () => {
    const wc = webContents.getFocusedWebContents();
    if (wc) {
      wc.openDevTools({ mode: 'detach' });
    }
  });

  globalShortcut.register('CommandOrControl+S', () => {
    const wc = webContents.getFocusedWebContents();
    if (wc) {
      const index = views.findIndex(v => v && v.webContents === wc);
      const controller = typeof getController === 'function' ? getController(index) : null;
      const label = controller != null ? controllerLabel(controller) : '';
      try { wc.executeJavaScript(audioDialogJS(label)); } catch {}
    }
  });

  globalShortcut.register('CommandOrControl+A', () => {
    views.forEach((view, i) => {
      if (view && view.webContents) {
        const deviceId = typeof getAudio === 'function' ? getAudio(i) : null;
        if (deviceId) {
          try { view.webContents.executeJavaScript(applyAudioJS(deviceId)); } catch {}
          return;
        }
        const controller = typeof getController === 'function' ? getController(i) : null;
        const label = controller != null ? controllerLabel(controller) : '';
        try { view.webContents.executeJavaScript(audioDialogJS(label, true)); } catch {}
      }
    });
  });

  for (let i = 0; i < 4; i++) {
    globalShortcut.register(`CommandOrControl+${i + 1}`, () => {
      toggleConfig(i);
    });
    globalShortcut.register(`CommandOrControl+Alt+${i + 1}`, () => {
      const view = views[i];
      if (view) view.webContents.focus();
    });
  }
}

module.exports = registerShortcuts;
module.exports.audioDialogJS = audioDialogJS;
module.exports.applyAudioJS = applyAudioJS;
