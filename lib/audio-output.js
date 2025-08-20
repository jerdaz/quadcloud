function buildAudioSinkScript(deviceId) {
  return `
    (async () => {
      try {
        window.__quadSinkDevice = '${deviceId}';
        if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput) {
          try { await navigator.mediaDevices.selectAudioOutput({ deviceId: window.__quadSinkDevice }); } catch {}
        }
        window.__quadApplySink = window.__quadApplySink || (async () => {
          try {
            const els = document.querySelectorAll('audio, video');
            for (const el of els) {
              if (typeof el.setSinkId === 'function') {
                try { await el.setSinkId(window.__quadSinkDevice); } catch {}
              }
            }
          } catch {}
        });
        await window.__quadApplySink();
        if (!window.__quadSinkObserver) {
          window.__quadSinkObserver = new MutationObserver(() => { window.__quadApplySink(); });
          window.__quadSinkObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
      } catch {}
    })();
  `;
}

module.exports = { buildAudioSinkScript };
