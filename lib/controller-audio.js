function getControllerIndexFromLabel(label = '') {
  if (typeof label !== 'string') return null;
  const match = /^Xbox Controller(?:\s*(\d))?$/.exec(label.trim());
  if (!match) return null;
  const num = match[1] ? parseInt(match[1], 10) : 1; // default to 1 when no number
  const index = num - 1; // controller 1 -> index 0
  if (index < 0 || index > 3) return null;
  return index;
}

module.exports = { getControllerIndexFromLabel };
