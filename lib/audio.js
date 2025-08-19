const getAudioSinkPatch = (deviceId) => `
(() => {
  const deviceId = ${JSON.stringify(deviceId)};
  const setDevice = async id => {
    try {
      const media = document.querySelectorAll('audio,video');
      for (const m of media) {
        if (typeof m.setSinkId === 'function') {
          try {
            await m.setSinkId(id);
            console.debug('[quadcloud] setSinkId on element', m.nodeName, id);
          } catch (err) {
            console.warn('[quadcloud] setSinkId failed', err);
          }
        }
      }
      if (window.__quadAudios) {
        for (const a of window.__quadAudios) {
          if (typeof a.setSinkId === 'function') {
            try {
              await a.setSinkId(id);
              console.debug('[quadcloud] setSinkId on Audio()', id);
            } catch (err) {
              console.warn('[quadcloud] setSinkId on Audio() failed', err);
            }
          }
        }
      }
      if (window.__quadAudioCtxs) {
        for (const ctx of window.__quadAudioCtxs) {
          if (typeof ctx.setSinkId === 'function') {
            try {
              await ctx.setSinkId(id);
              console.debug('[quadcloud] setSinkId on AudioContext', id);
            } catch (err) {
              console.warn('[quadcloud] setSinkId on AudioContext failed', err);
            }
          }
        }
      }
      window.__quadAudioDevice = id;
    } catch (err) {
      console.warn('[quadcloud] setDevice failed', err);
    }
  };
  if (!window.__quadAudioCtxs) {
    window.__quadAudioCtxs = [];
    window.__quadAudios = [];
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const Wrapped = function(...args) {
        const ctx = new AC(...args);
        window.__quadAudioCtxs.push(ctx);
        if (window.__quadAudioDevice && typeof ctx.setSinkId === 'function') {
          ctx.setSinkId(window.__quadAudioDevice).catch(err => console.warn('[quadcloud] initial ctx setSinkId failed', err));
        }
        return ctx;
      };
      Wrapped.prototype = AC.prototype;
      window.AudioContext = window.webkitAudioContext = Wrapped;
    }
    const Aud = window.Audio;
    if (Aud) {
      const WrappedAudio = function(...args) {
        const a = new Aud(...args);
        window.__quadAudios.push(a);
        if (window.__quadAudioDevice && typeof a.setSinkId === 'function') {
          a.setSinkId(window.__quadAudioDevice).catch(err => console.warn('[quadcloud] initial Audio() setSinkId failed', err));
        }
        return a;
      };
      WrappedAudio.prototype = Aud.prototype;
      window.Audio = WrappedAudio;
    }
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
            if (window.__quadAudioDevice && typeof node.setSinkId === 'function') {
              try {
                node.setSinkId(window.__quadAudioDevice);
                console.debug('[quadcloud] setSinkId on added node', node.nodeName);
              } catch (err) {
                console.warn('[quadcloud] setSinkId on added node failed', err);
              }
            }
          } else if (node.querySelectorAll) {
            node.querySelectorAll('audio,video').forEach(el => {
              if (window.__quadAudioDevice && typeof el.setSinkId === 'function') {
                try {
                  el.setSinkId(window.__quadAudioDevice);
                  console.debug('[quadcloud] setSinkId on added element', el.nodeName);
                } catch (err) {
                  console.warn('[quadcloud] setSinkId on added element failed', err);
                }
              }
            });
          }
        }
      }
    });
    try {
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (err) {
      console.warn('[quadcloud] mutation observer failed', err);
    }
  }
  setDevice(deviceId);
})();
`;

function injectAudioSinkPatchIntoFrame(frame, deviceId) {
  try {
    frame.executeJavaScript(getAudioSinkPatch(deviceId), true);
  } catch {}
}

function applyAudioSink(wc, deviceId) {
  wc.__audioDevice = deviceId;
  if (!deviceId) return;
  try {
    const mf = wc.mainFrame;
    injectAudioSinkPatchIntoFrame(mf, deviceId);
    for (const f of mf.frames) injectAudioSinkPatchIntoFrame(f, deviceId);
  } catch {}
}

function installAudioSink(wc, deviceId) {
  wc.__audioDevice = deviceId;
  wc.on('dom-ready', () => applyAudioSink(wc, wc.__audioDevice));
  wc.on('did-frame-navigate', (_e, details) => {
    const id = wc.__audioDevice;
    if (!id) return;
    try {
      const f = wc.mainFrame.frames.find(fr => fr.frameTreeNodeId === details.frameTreeNodeId);
      if (f) injectAudioSinkPatchIntoFrame(f, id);
    } catch {}
  });
  wc.on('frame-created', (_e, details) => {
    const id = wc.__audioDevice;
    if (!id) return;
    try { injectAudioSinkPatchIntoFrame(details.frame, id); } catch {}
  });
  wc.on('did-start-navigation', () => applyAudioSink(wc, wc.__audioDevice));
  applyAudioSink(wc, deviceId);
}

module.exports = { getAudioSinkPatch, installAudioSink, applyAudioSink };
