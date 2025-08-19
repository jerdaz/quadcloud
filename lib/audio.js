function applyAudioOutput(webContents, deviceId) {
  if (!webContents || !deviceId) return;

  const escaped = deviceId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const script = `(() => {
    window.__audioSink = '${escaped}';
    (function init() {
      const HME = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
      if (HME) {
        if (!HME.__playPatched) {
          HME.__playPatched = true;
          const origPlay = HME.play;
          HME.play = function(...args) {
            try {
              if (typeof this.setSinkId === 'function') {
                this.setSinkId(window.__audioSink).catch(() => {});
              }
            } catch {}
            return origPlay.apply(this, args);
          };
        }
        if (typeof HME.setSinkId === 'function' && !HME.__setSinkPatched) {
          HME.__setSinkPatched = true;
          const origSetSinkId = HME.setSinkId;
          HME.setSinkId = function(sinkId) {
            const target = sinkId === window.__audioSink ? sinkId : window.__audioSink;
            return origSetSinkId.call(this, target).catch(err => {
              console.warn('setSinkId forced failed:', err && (err.name || err));
              throw err;
            });
          };
        }
        document.querySelectorAll('audio,video').forEach(el => {
          if (typeof el.setSinkId === 'function') {
            el.setSinkId(window.__audioSink).catch(() => {});
          }
        });
      }

      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !AC.prototype.__sinkPatched) {
        AC.prototype.__sinkPatched = true;
        const OrigAC = AC;
        function PatchedAC(...args) {
          const ctx = new OrigAC(...args);
          if (typeof ctx.setSinkId === 'function') {
            ctx.setSinkId(window.__audioSink).catch(err => {
              console.warn('AudioContext.setSinkId failed:', err && (err.name || err));
            });
          }
          return ctx;
        }
        PatchedAC.prototype = OrigAC.prototype;
        Object.setPrototypeOf(PatchedAC, OrigAC);
        window.AudioContext = PatchedAC;
        if (window.webkitAudioContext) window.webkitAudioContext = PatchedAC;
      }

      if (!window.__sinkInterval) {
        window.__sinkInterval = setInterval(() => {
          document.querySelectorAll('audio,video').forEach(el => {
            if (typeof el.setSinkId === 'function') {
              el.setSinkId(window.__audioSink).catch(() => {});
            }
          });
        }, 1500);
      }
    })();
  })()`;
  try { webContents.executeJavaScript(script, true); } catch {}
}

function allowSpeakerSelection(session) {
  if (!session) return;
  try {
    session.setPermissionRequestHandler((_wc, perm, cb) => {
      if (perm === 'speaker-selection') return cb(true);
      cb(false);
    });
    session.setPermissionCheckHandler((_wc, perm) => perm === 'speaker-selection');
  } catch {}
}

module.exports = { applyAudioOutput, allowSpeakerSelection };
