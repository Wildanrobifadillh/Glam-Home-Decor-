import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function DateRangeFilter({
  value = {
    dateFrom: "",
    dateTo: "",
  },
  onChange,
}) {
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const dateFrom = value.dateFrom || "";
  const dateTo = value.dateTo || "";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToday = () => {
    const today = formatDateInput(new Date());

    onChange({
      dateFrom: today,
      dateTo: today,
    });
  };

  const handleReset = () => {
    onChange({
      dateFrom: "",
      dateTo: "",
    });

    setIsOpen(false);
  };

  const handleDateFromChange = (event) => {
    onChange({
      dateFrom: event.target.value,
      dateTo,
    });
  };

  const handleDateToChange = (event) => {
    onChange({
      dateFrom,
      dateTo: event.target.value,
    });
  };

  const label = getDateRangeLabel({
    dateFrom,
    dateTo,
  });

  return (
    <div className="date-range-filter" ref={wrapperRef}>
      <button
        type="button"
        className="date-range-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        <CalendarDays size={16} />
        <span>{label}</span>
      </button>

      {isOpen ? (
        <div className="date-range-popover">
          <div className="date-range-popover-header">
            <strong>Filter Tanggal</strong>

            <button type="button" onClick={handleToday}>
              Hari Ini
            </button>
          </div>

          <div className="date-range-fields">
            <label>
              Dari Tanggal
              <input
                type="date"
                value={dateFrom}
                onChange={handleDateFromChange}
              />
            </label>

            <label>
              Sampai Tanggal
              <input
                type="date"
                value={dateTo}
                onChange={handleDateToChange}
              />
            </label>
          </div>

          <div className="date-range-actions">
            <button type="button" onClick={handleReset}>
              Reset
            </button>

            <button type="button" onClick={() => setIsOpen(false)}>
              Terapkan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getDateRangeLabel(value) {
  if (value.dateFrom && value.dateTo) {
    if (value.dateFrom === value.dateTo) {
      return formatDisplayDate(value.dateFrom);
    }

    return `${formatDisplayDate(value.dateFrom)} - ${formatDisplayDate(
      value.dateTo
    )}`;
  }

  if (value.dateFrom) {
    return `Dari ${formatDisplayDate(value.dateFrom)}`;
  }

  if (value.dateTo) {
    return `Sampai ${formatDisplayDate(value.dateTo)}`;
  }

  return "Tanggal";
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

export default DateRangeFilter;