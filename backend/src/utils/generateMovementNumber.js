const generateMovementNumber = (type) => {
  const now = new Date();

  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.getTime();

  return `STK-${type}-${date}-${time}`;
};

module.exports = {
  generateMovementNumber,
};