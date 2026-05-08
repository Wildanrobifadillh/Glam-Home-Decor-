const generateStockOpnameNumber = () => {
  const now = new Date();

  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.getTime();

  return `SO-${date}-${time}`;
};

module.exports = {
  generateStockOpnameNumber,
};