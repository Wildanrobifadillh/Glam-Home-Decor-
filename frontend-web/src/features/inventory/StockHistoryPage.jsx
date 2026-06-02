import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import DateRangeFilter from "../../components/form/DateRangeFilter";
import Table from "../../components/ui/Table";

import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/formatDateTime";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { productApi } from "../products/product.api";
import { inventoryApi } from "./inventory.api";


const DEFAULT_PAGE_SIZE = 15;

const movementTypes = [
  { value: "IN", label: "Barang Masuk" },
  { value: "OUT", label: "Barang Keluar" },
  { value: "DAMAGED", label: "Barang Rusak" },
  { value: "ADJUSTMENT", label: "Penyesuaian" },
];

function StockHistoryPage() {
  const [stockHistories, setStockHistories] = useState([]);
  const [products, setProducts] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    productId: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  });

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStockHistories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await inventoryApi.getStockHistories({
        search: debouncedSearch || undefined,
        productId: filters.productId || undefined,
        type: filters.type || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.stockHistories ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const rawList = Array.isArray(list) ? list : [];

      const filteredList = rawList.filter((history) =>
        isDateInRange(history.createdAt, filters.dateFrom, filters.dateTo)
    );

    setStockHistories(filteredList);

    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStockHistories([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters.productId, filters.type, filters.dateFrom, filters.dateTo]);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);

    try {
      const response = await productApi.getList();

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.products ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchStockHistories();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchStockHistories]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProducts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchProducts]);

  const handleSearchChange = (value) => {
    setCurrentPage(1);
    setSearchInput(value);
  };

  const handleProductFilterChange = (event) => {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      productId: event.target.value,
    }));
  };

  const handleTypeFilterChange = (event) => {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      type: event.target.value,
    }));
  };

    const handleResetFilter = () => {
      setCurrentPage(1);
      setSearchInput("");
      setFilters({
        productId: "",
        type: "",
        dateFrom: "",
        dateTo: "",
      });
    };

    const handleDateRangeChange = (value) => {
      setCurrentPage(1);
      setFilters((currentFilters) => ({
        ...currentFilters,
        dateFrom: value.dateFrom,
        dateTo: value.dateTo,
      }));
    };

    const {
      currentPage,
      totalPages,
      paginatedData: paginatedStockHistories,
      startItem,
      endItem,
      totalItems,
      setCurrentPage,
    } = usePagination(stockHistories, {
      pageSize: DEFAULT_PAGE_SIZE,
      resetKey: JSON.stringify({
        search: debouncedSearch,
        productId: filters.productId,
        type: filters.type,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    });

    const columns = useMemo(
      () => [
        {
          key: "movementNumber",
          label: "No. Mutasi",
          width: "220px",
          align: "center",
          render: (row) => (
            <span
              className="stock-history-movement"
              title={row.movementNumber || ""}
            >
              {row.movementNumber || "-"}
            </span>
          ),
        },
        {
          key: "createdAt",
          label: "Tanggal",
          width: "170px",
          align: "center",
          render: (row) => (
            <span className="stock-history-date">
              {formatDateTime(row.createdAt)}
            </span>
          ),
        },
        {
          key: "supplierCode",
          label: "Kode Barang",
          width: "150px",
          align: "center",
          render: (row) => <strong>{row.product?.supplierCode || "-"}</strong>,
        },
        {
          key: "productName",
          label: "Nama Barang",
          width: "240px",
          align: "center",
          render: (row) => (
            <span className="stock-history-product-name" title={row.product?.name || ""}>
              {row.product?.name || "-"}
            </span>
          ),
        },
        {
          key: "category",
          label: "Kategori",
          width: "140px",
          align: "center",
          render: (row) => row.product?.category?.name || "-",
        },
        {
          key: "type",
          label: "Tipe",
          width: "140px",
          align: "center",
          render: (row) => (
            <Badge tone={getMovementTone(row.type)}>
              {getMovementLabel(row.type)}
            </Badge>
          ),
        },
        {
          key: "quantity",
          label: "Qty",
          width: "90px",
          align: "center",
          render: (row) => (
            <strong className={`stock-history-qty is-${row.type?.toLowerCase()}`}>
              {formatMovementQuantity(row.type, row.quantity)}
            </strong>
          ),
        },
        {
          key: "stockBefore",
          label: "Sebelum",
          width: "110px",
          align: "center",
          render: (row) => row.stockBefore,
        },
        {
          key: "stockAfter",
          label: "Sesudah",
          width: "110px",
          align: "center",
          render: (row) => row.stockAfter,
        },
        {
          key: "createdBy",
          label: "Dibuat Oleh",
          width: "170px",
          align: "center",
          render: (row) => row.createdBy?.name || row.createdBy?.username || "-",
        },
        {
          key: "note",
          label: "Catatan",
          width: "250px",
          align: "center",
          render: (row) => (
            <span className="stock-history-note" title={row.note || ""}>
              {row.note || "-"}
            </span>
          ),
        },
      ],
      []
    );

  return (
    <ListPageLayout
      eyebrow=""
      title="Histori Stok"
      description="Pantau riwayat semua pergerakan stok barang."
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari no mutasi, kode, atau nama barang..."
          />

          <Select
            value={filters.productId}
            onChange={handleProductFilterChange}
            disabled={isLoadingProducts}
          >
            <option value="">
              {isLoadingProducts ? "Memuat barang..." : "Semua Barang"}
            </option>

            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.supplierCode} - {product.name}
              </option>
            ))}
          </Select>

          <Select value={filters.type} onChange={handleTypeFilterChange}>
            <option value="">Semua Tipe</option>
            {movementTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>

          <DateRangeFilter
            value={{
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            }}
            onChange={handleDateRangeChange}
          />
          
          <Button variant="secondary" size="sm" onClick={fetchStockHistories}>
            <RefreshCcw size={15} />
            Refresh
          </Button>

          <Button variant="secondary" size="sm" onClick={handleResetFilter}>
            Reset Filter
          </Button>
        </FilterBar>
      }
    >
      {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}

      <div className="stock-history-table-shell">
        <Table
          className="stock-history-table"
          columns={columns}
          data={paginatedStockHistories}
          isLoading={isLoading}
          emptyTitle="Histori stok belum tersedia"
          emptyDescription="Belum ada histori stok yang cocok dengan filter saat ini."
        />
      </div>

      <div className="stock-history-pagination">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </ListPageLayout>
  );
}

function getMovementLabel(type) {
  if (type === "IN") return "Masuk";
  if (type === "OUT") return "Keluar";
  if (type === "DAMAGED") return "Rusak";
  if (type === "ADJUSTMENT") return "Penyesuaian";

  return type || "-";
}

function getMovementTone(type) {
  if (type === "IN") return "success";
  if (type === "OUT") return "warning";
  if (type === "DAMAGED") return "danger";
  if (type === "ADJUSTMENT") return "neutral";

  return "neutral";
}

function formatMovementQuantity(type, quantity) {
  if (type === "IN") return `+${quantity}`;
  if (type === "OUT" || type === "DAMAGED") return `-${quantity}`;

  return quantity;
}

function isDateInRange(value, dateFrom, dateTo) {
  if (!value) {
    return false;
  }

  const currentDate = new Date(value);

  if (dateFrom) {
    const startDate = new Date(`${dateFrom}T00:00:00`);

    if (currentDate < startDate) {
      return false;
    }
  }

  if (dateTo) {
    const endDate = new Date(`${dateTo}T23:59:59`);

    if (currentDate > endDate) {
      return false;
    }
  }

  return true;
}

export default StockHistoryPage;