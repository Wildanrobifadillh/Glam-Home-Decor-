const generateSaleReturnNumber = () => {
  const now = new Date();

  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.getTime();

  return `SR-${date}-${time}`;
};

module.exports = {
  generateSaleReturnNumber,
};