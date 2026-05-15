import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
}) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious && onPageChange) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext && onPageChange) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="ui-pagination">
      <p>
        Total data: <strong>{totalItems}</strong>
      </p>

      <div className="ui-pagination-actions">
        <button type="button" onClick={handlePrevious} disabled={!canGoPrevious}>
          <ChevronLeft size={17} />
          Sebelumnya
        </button>

        <span>
          Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
        </span>

        <button type="button" onClick={handleNext} disabled={!canGoNext}>
          Berikutnya
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;