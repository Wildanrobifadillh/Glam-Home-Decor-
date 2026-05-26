import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  startItem = 0,
  endItem = 0,
  pageSize = 15,
  onPageChange,
}) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  if (totalItems <= pageSize) {
    return null;
  }

  const safeStartItem = startItem || 1;
  const safeEndItem = endItem || Math.min(page * pageSize, totalItems);

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
        Menampilkan <strong>{safeStartItem}</strong> -{" "}
        <strong>{safeEndItem}</strong> dari <strong>{totalItems}</strong> data
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