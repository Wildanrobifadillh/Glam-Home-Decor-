const generateSaleNumber = () => {
  const now = new Date();

  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.getTime();

  return `PJ-${date}-${time}`;
};

module.exports = {
  generateSaleNumber,
};