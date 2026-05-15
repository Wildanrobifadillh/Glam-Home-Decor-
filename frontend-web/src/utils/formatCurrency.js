export const formatCurrency = (value) => {
  const numberValue = Number(value || 0);

  return `Rp. ${numberValue.toLocaleString("id-ID")}`;
};