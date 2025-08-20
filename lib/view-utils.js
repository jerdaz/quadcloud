function destroyView(win, view) {
  if (!view) return;
  try { win.removeBrowserView(view); } catch {}
  try { view.webContents.destroy(); } catch {}
  try { if (typeof view.destroy === 'function') view.destroy(); } catch {}
}

function closeConfigView(win, configViews, index) {
  const cfg = configViews[index];
  if (!cfg) return;
  try { win.removeBrowserView(cfg); } catch {}
  configViews[index] = undefined;
}

async function setAudioOutput(view, deviceId) {
  if (!view || !deviceId) return;
  const js = `(
    async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
          await navigator.mediaDevices.selectAudioOutput();
        }
        const els = document.querySelectorAll('video,audio');
        for (const el of els) {
          if (typeof el.setSinkId === 'function') {
            await el.setSinkId(${JSON.stringify(deviceId)});
          }
        }
      } catch {}
    }
  )();`;
  try {
    await view.webContents.executeJavaScript(js, true);
  } catch {}
}

module.exports = { destroyView, closeConfigView, setAudioOutput };
