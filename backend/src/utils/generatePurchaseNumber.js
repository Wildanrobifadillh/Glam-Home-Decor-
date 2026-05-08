const generatePurchaseNumber = () => {
  const now = new Date();

  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.getTime();

  return `PB-${date}-${time}`;
};

module.exports = {
  generatePurchaseNumber,
};