const { app, globalShortcut, webContents } = require('electron');

const AUDIO_DIALOG_JS = `
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

function registerShortcuts(views, toggleConfig) {
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
      try { wc.executeJavaScript(AUDIO_DIALOG_JS); } catch {}
    }
  });

  views.forEach((view, i) => {
    globalShortcut.register(`CommandOrControl+${i + 1}`, () => {
      toggleConfig(i);
    });
    globalShortcut.register(`CommandOrControl+Alt+${i + 1}`, () => {
      view.webContents.focus();
    });
  });
}

module.exports = registerShortcuts;
