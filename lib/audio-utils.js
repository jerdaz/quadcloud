function overrideAudioSink(wc, sinkId) {
  if (!wc || !sinkId) return;
  const escaped = JSON.stringify(sinkId);
  const script = `(() => {
    const sink = ${escaped};
    const apply = (v) => { try { if (v.setSinkId) v.setSinkId(sink).catch(() => {}); } catch {}}
    for (const vid of document.querySelectorAll('video')) apply(vid);
    const mo = new MutationObserver(() => {
      for (const vid of document.querySelectorAll('video')) apply(vid);
    });
    mo.observe(document, { childList: true, subtree: true });
  })()`;
  try { wc.executeJavaScript(script, true); } catch {}
}

module.exports = { overrideAudioSink };
