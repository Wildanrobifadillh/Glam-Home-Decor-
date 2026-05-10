const generatePayrollNumber = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const timestamp = now.getTime();

  return `PAY-${year}${month}${date}-${timestamp}`;
};

module.exports = {
  generatePayrollNumber,
};