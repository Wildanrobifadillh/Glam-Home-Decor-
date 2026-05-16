import Input from "../ui/Input";

function CurrencyInput({
  name,
  value,
  onChange,
  placeholder = "0",
  ...props
}) {
  const displayValue = formatCurrencyInput(value);

  const handleChange = (event) => {
    const rawValue = event.target.value.replace(/\D/g, "");

    onChange({
      target: {
        name,
        value: rawValue,
      },
    });
  };

  return (
    <Input
      {...props}
      type="text"
      name={name}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="off"
    />
  );
}

function formatCurrencyInput(value) {
  const numericValue = String(value || "").replace(/\D/g, "");

  if (!numericValue) {
    return "";
  }

  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default CurrencyInput;