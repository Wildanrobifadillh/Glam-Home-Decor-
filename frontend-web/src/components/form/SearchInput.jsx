import { Search, X } from "lucide-react";

function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Cari data...",
}) {
  const handleChange = (event) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    if (onChange) {
      onChange("");
    }
  };

  return (
    <div className="search-input">
      <Search size={17} />

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />

      {value ? (
        <button type="button" onClick={handleClear} aria-label="Hapus pencarian">
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default SearchInput;