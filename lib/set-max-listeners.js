const DEFAULT_MAX_LISTENERS = 30;

function setMaxListeners(emitter, max = DEFAULT_MAX_LISTENERS) {
  if (emitter && typeof emitter.setMaxListeners === 'function') {
    emitter.setMaxListeners(max);
  }
}

module.exports = setMaxListeners;
module.exports.DEFAULT_MAX_LISTENERS = DEFAULT_MAX_LISTENERS;
