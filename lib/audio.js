function applyAudioOutput(view, deviceId) {
  if (!view) return;
  const script = `
    (async () => {
      const preferredId = ${JSON.stringify(deviceId)};
      async function pickId() {
        try { await navigator.mediaDevices.selectAudioOutput(); } catch (e) {}
        return preferredId || 'default';
      }
      const sinkId = await pickId();
      function setAllMedia() {
        const nodes = Array.from(document.querySelectorAll('audio, video'));
        nodes.forEach(el => {
          if (typeof el.setSinkId === 'function') {
            el.setSinkId(sinkId).catch(err => console.warn('setSinkId failed', err));
          }
        });
      }
      setAllMedia();
      const mo = new MutationObserver(setAllMedia);
      mo.observe(document.documentElement, { childList: true, subtree: true });
    })();
  `;
  try { view.webContents.mainFrame.executeJavaScript(script, true); } catch {}
}

module.exports = { applyAudioOutput };
