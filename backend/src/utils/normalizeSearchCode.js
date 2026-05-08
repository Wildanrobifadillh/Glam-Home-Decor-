const normalizeSearchCode = (code) => {
  if (!code) {
    return "";
  }

  return code
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

module.exports = {
  normalizeSearchCode,
};