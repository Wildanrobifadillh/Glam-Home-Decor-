import {
  Eye,
  FileBarChart,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { usePagination } from "../../hooks/usePagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDateTime } from "../../utils/formatDateTime";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { saleApi } from "./sale.api";


function SaleListPage() {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    paymentStatus: "",
    saleStatus: "",
  });

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await saleApi.getList();
      const responseData = response.data?.data || response.data;
      const list =
        responseData?.sales ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setSales(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchSales();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchSales]);

  const filteredSales = useMemo(() => {
  const keyword = debouncedSearch.trim().toLowerCase();

  return sales.filter((sale) => {
    const matchesSearch = keyword
      ? [
          sale.saleNumber,
          sale.invoiceNumber,
          sale.customerName,
          sale.customerPhone,
          sale.customer?.name,
          sale.customer?.phone,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      : true;

    const matchesDate = isDateInRange(
      sale.createdAt,
      filters.dateFrom,
      filters.dateTo
    );

    const matchesPaymentStatus = filters.paymentStatus
      ? sale.paymentStatus === filters.paymentStatus
      : true;

    const isRejectedOrCancelledSale = ["REJECTED", "CANCELLED"].includes(
      sale.status
    );

    const shouldHideFromPaymentFilter =
      filters.paymentStatus &&
      !filters.saleStatus &&
      isRejectedOrCancelledSale;

    const matchesSaleStatus = filters.saleStatus
      ? sale.status === filters.saleStatus
      : true;

    return (
      matchesSearch &&
      matchesDate &&
      matchesPaymentStatus &&
      !shouldHideFromPaymentFilter &&
      matchesSaleStatus
    );
  });
}, [
  sales,
  debouncedSearch,
  filters.dateFrom,
  filters.dateTo,
  filters.paymentStatus,
  filters.saleStatus,
]);

  const financialSales = useMemo(() => {
  return filteredSales.filter(
    (sale) => !["REJECTED", "CANCELLED"].includes(sale.status)
  );
}, [filteredSales]);

const summary = useMemo(() => {
  return {
    saleCount: filteredSales.length,
    totalAmount: financialSales.reduce(
      (total, sale) => total + Number(sale.totalAmount || 0),
      0
    ),
    totalPaidAmount: financialSales.reduce(
      (total, sale) => total + Number(sale.paidAmount || 0),
      0
    ),
    totalRemainingAmount: financialSales.reduce(
      (total, sale) => total + Number(sale.remainingAmount || 0),
      0
    ),
  };
}, [filteredSales, financialSales]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSales,
    startItem,
    endItem,
    totalItems,
    setCurrentPage,
  } = usePagination(filteredSales, {
    pageSize: 15,
    resetKey: JSON.stringify({
      search: debouncedSearch,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      paymentStatus: filters.paymentStatus,
      saleStatus: filters.saleStatus,
    }),
  });

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (event) => {
  const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));

    setCurrentPage(1);
  };

  const handleDateRangeChange = (value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));

    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchInput("");
    setFilters({
      dateFrom: "",
      dateTo: "",
      paymentStatus: "",
      saleStatus: "",
    });
    setCurrentPage(1);
  };

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        label: "Tanggal",
        width: "170px",
        align: "center",
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "saleNumber",
        label: "No Penjualan",
        width: "230px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">{row.saleNumber || "-"}</span>
        ),
      },
      {
        key: "invoiceNumber",
        label: "No Invoice",
        width: "210px",
        align: "center",
        render: (row) => row.invoiceNumber || "-",
      },
      {
        key: "customer",
        label: "Customer",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.customer?.name || row.customerName || "-"}</strong>
            <span>{row.customer?.phone || row.customerPhone || "-"}</span>
          </div>
        ),
      },
      {
        key: "totalAmount",
        label: "Total",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.totalAmount),
      },
      {
        key: "paidAmount",
        label: "Dibayar",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.paidAmount),
      },
      {
        key: "remainingAmount",
        label: "Sisa",
        width: "160px",
        align: "center",
        render: (row) => (
          <strong
            className={Number(row.remainingAmount || 0) > 0 ? "text-danger" : ""}
          >
            {formatCurrency(row.remainingAmount)}
          </strong>
        ),
      },
      {
        key: "paymentStatus",
        label: "Status Bayar",
        width: "150px",
        align: "center",
        render: (row) => {
          const status = getPaymentStatusMeta(row.paymentStatus);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "status",
        label: "Status Sale",
        width: "165px",
        align: "center",
        render: (row) => {
          const status = getSaleStatusMeta(row.status);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "actions",
        label: "Aksi",
        width: "150px",
        align: "center",
        render: (row) => (
          <div className="table-action-buttons">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/sales/${row.id}`)}
            >
              <Eye size={15} />
              Detail
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Penjualan / Kasir"
      description="Kelola transaksi penjualan, invoice, approval piutang, dan pembayaran pelanggan."
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate("/sales/report")}>
            <FileBarChart size={17} />
            Laporan
          </Button>

          <Button onClick={() => navigate("/sales/create")}>
            <ShoppingCart size={17} />
            Buka Kasir
          </Button>
        </>
      }
      filters={
        <FilterBar>
            <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari no penjualan, invoice, atau customer..."
            />

            <DateRangeFilter
            value={{
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
            }}
            onChange={handleDateRangeChange}
            />

            <Select
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleFilterChange}
            >
            <option value="">Semua Status Bayar</option>
            <option value="PAID">Lunas</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="UNPAID">Belum Dibayar</option>
            </Select>
            <Button variant="secondary" size="sm" onClick={fetchSales}>
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

      <div className="sale-list-summary-grid">
        <SaleSummaryCard
          tone="count"
          label="Jumlah Transaksi"
          value={summary.saleCount}
          helper="Transaksi sesuai filter"
        />

        <SaleSummaryCard
          tone="sales"
          label="Total Penjualan"
          value={formatCurrency(summary.totalAmount)}
          helper="Akumulasi tagihan"
        />

        <SaleSummaryCard
          tone="paid"
          label="Total Dibayar"
          value={formatCurrency(summary.totalPaidAmount)}
          helper="Pembayaran tercatat"
        />

        <SaleSummaryCard
          tone="remaining"
          label="Sisa Piutang"
          value={formatCurrency(summary.totalRemainingAmount)}
          helper="Tagihan belum lunas"
          danger={summary.totalRemainingAmount > 0}
        />
      </div>

      <Table
          className="sale-list-table"
          columns={columns}
          data={paginatedSales}
          isLoading={isLoading}
          emptyTitle="Penjualan belum tersedia"
          emptyDescription="Belum ada transaksi penjualan yang cocok dengan filter saat ini."
        />
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startItem={startItem}
        endItem={endItem}
        pageSize={15}
        onPageChange={setCurrentPage}
      />
    </ListPageLayout>
  );
}

function SaleSummaryCard({ tone, label, value, helper, danger = false }) {
  return (
    <div className={`sale-summary-card sale-summary-card-${tone}`}>
      <span>{label}</span>
      <strong className={danger ? "text-danger" : ""}>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function getPaymentStatusMeta(status) {
  if (status === "PAID") {
    return {
      label: "Lunas",
      tone: "success",
    };
  }

  if (status === "PARTIAL") {
    return {
      label: "Sebagian",
      tone: "warning",
    };
  }

  return {
    label: "Belum Dibayar",
    tone: "danger",
  };
}

function getSaleStatusMeta(status) {
  if (status === "COMPLETED") {
    return {
      label: "Selesai",
      tone: "success",
    };
  }

  if (status === "PENDING_APPROVAL") {
    return {
      label: "Pending",
      tone: "warning",
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Ditolak",
      tone: "danger",
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Dibatalkan",
      tone: "neutral",
    };
  }

  return {
    label: status || "-",
    tone: "neutral",
  };
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

export default SaleListPage;