import Button from "../ui/Button";

function FilterBar({
  children,
  onReset,
  resetLabel = "Reset Filter",
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-fields">{children}</div>

      {onReset ? (
        <div className="filter-bar-actions">
          <Button variant="secondary" size="sm" onClick={onReset}>
            {resetLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default FilterBar;