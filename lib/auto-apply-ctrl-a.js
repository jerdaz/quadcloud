const { audioDialogJS } = require('./register-shortcuts');

function controllerLabel(controller) {
  return controller === 0 ? 'Xbox Controller' : `Xbox Controller ${controller + 1}`;
}

function installAutoApplyCtrlA(wc, controller) {
  if (!wc) return;
  const label = controller != null ? controllerLabel(controller) : '';
  const apply = () => {
    try { wc.executeJavaScript(audioDialogJS(label, true)); } catch {}
  };

  wc.on('media-started-playing', apply);

  wc.on('dom-ready', () => {
    const script = `(() => {
      const apply = () => { ${audioDialogJS(label, true)} };
      apply();
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', apply);
      }
      const mo = new MutationObserver(muts => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.tagName === 'VIDEO' || (n.querySelector && n.querySelector('video'))) {
              apply();
              return;
            }
          }
        }
      });
      mo.observe(document, { childList: true, subtree: true });
    })();`;
    try { wc.executeJavaScript(script); } catch {}
  });
}

module.exports = installAutoApplyCtrlA;
module.exports.controllerLabel = controllerLabel;
