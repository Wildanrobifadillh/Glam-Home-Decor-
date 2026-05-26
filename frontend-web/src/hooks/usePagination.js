import { useMemo, useState } from "react";

export function usePagination(data = [], options = {}) {
  const pageSize = options.pageSize || 15;
  const resetKey = options.resetKey || "";

  const [pageState, setPageState] = useState({
    page: 1,
    resetKey,
  });

  const totalItems = Array.isArray(data) ? data.length : 0;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

  const rawCurrentPage =
    pageState.resetKey === resetKey ? pageState.page : 1;

  const currentPage = Math.min(Math.max(rawCurrentPage, 1), totalPages);

  const paginatedData = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const setCurrentPage = (nextPage) => {
    const resolvedPage =
      typeof nextPage === "function" ? nextPage(currentPage) : nextPage;

    const safePage = Math.min(Math.max(Number(resolvedPage) || 1, 1), totalPages);

    setPageState({
      page: safePage,
      resetKey,
    });
  };

  return {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedData,
    startItem,
    endItem,
    setCurrentPage,
  };
}