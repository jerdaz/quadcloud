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

function setAudioSink(wc, deviceId) {
  if (!wc || !deviceId) return;
  const js = `(() => {
    const sinkId = ${JSON.stringify(deviceId)};
    const apply = root => {
      for (const v of root.querySelectorAll('video')) {
        if (typeof v.setSinkId === 'function') {
          try { v.setSinkId(sinkId); } catch {}
        }
      }
    };
    apply(document);
    if (!window.__quadAudioObserver) {
      window.__quadAudioObserver = new MutationObserver(muts => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.tagName === 'VIDEO') {
              if (typeof n.setSinkId === 'function') try { n.setSinkId(window.__quadAudioSinkId); } catch {}
            } else if (n.querySelectorAll) {
              apply(n);
            }
          }
        }
      });
      window.__quadAudioObserver.observe(document, { childList: true, subtree: true });
    }
    window.__quadAudioSinkId = sinkId;
  })();`;
  try { wc.executeJavaScript(js, true); } catch {}
}

module.exports = { destroyView, closeConfigView, setAudioSink };
