import {
  ArrowLeft,
  Download,
  FileBarChart,
  FileSpreadsheet,
  RefreshCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { downloadFile, getFileNameFromContentDisposition } from "../../utils/downloadFile";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { getDownloadErrorMessage } from "../../utils/getDownloadErrorMessage";
import { saleApi } from "./sale.api";

function SaleReportPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    paymentStatus: "",
    paymentMethod: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [reportData, setReportData] = useState({
    sales: [],
    summary: null,
    periodLabel: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const reportParams = useMemo(() => {
    return buildReportParams(filters, debouncedSearch);
  }, [filters, debouncedSearch]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await saleApi.getReport(reportParams);
      const responseData = response.data?.data || response.data;
      const report = responseData?.report || responseData || {};

      const sales =
        report?.sales ||
        responseData?.sales ||
        responseData?.items ||
        responseData?.data ||
        [];

      const safeSales = Array.isArray(sales) ? sales : [];
      const summary = calculateSaleSummary(safeSales);

      setReportData({
        sales: safeSales,
        summary,
        periodLabel:
          report?.periodLabel ||
          responseData?.periodLabel ||
          getPeriodLabel(filters),
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setReportData({
        sales: [],
        summary: calculateSaleSummary([]),
        periodLabel: getPeriodLabel(filters),
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportParams, filters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchReport();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchReport]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
  };

  const handleDateRangeChange = (value) => {
    setFilters((current) => ({
      ...current,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilter = () => {
    setSearchInput("");

    setFilters({
      dateFrom: "",
      dateTo: "",
      paymentStatus: "",
      paymentMethod: "",
    });
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setErrorMessage("");

    try {
      const response = await saleApi.exportReportPdf(reportParams);

      const fileName =
        getFileNameFromContentDisposition(response.headers?.["content-disposition"]) ||
        getDefaultExportFileName("pdf", filters);

      downloadFile({
        blob: response.data,
        fileName,
      });
    } catch (error) {
      setErrorMessage(await getDownloadErrorMessage(error));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setErrorMessage("");

    try {
      const response = await saleApi.exportReportExcel(reportParams);

      const fileName =
        getFileNameFromContentDisposition(response.headers?.["content-disposition"]) ||
        getDefaultExportFileName("xlsx", filters);

      downloadFile({
        blob: response.data,
        fileName,
      });
    } catch (error) {
      setErrorMessage(await getDownloadErrorMessage(error));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const filteredSales = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return reportData.sales.filter((sale) => {
      const saleNumber = sale.saleNumber || "";
      const invoiceNumber = sale.invoiceNumber || "";
      const customerName = sale.customer?.name || sale.customerName || "";
      const customerPhone = sale.customer?.phone || sale.customerPhone || "";

      const matchesSearch = keyword
        ? saleNumber.toLowerCase().includes(keyword) ||
          invoiceNumber.toLowerCase().includes(keyword) ||
          customerName.toLowerCase().includes(keyword) ||
          customerPhone.toLowerCase().includes(keyword)
        : true;

      const matchesDate = isDateInRange(
        sale.createdAt,
        filters.dateFrom,
        filters.dateTo
      );

      return matchesSearch && matchesDate;
    });
  }, [reportData.sales, debouncedSearch, filters.dateFrom, filters.dateTo]);

  const salesReportPagination = usePagination(filteredSales, {
    pageSize: 15,
  });

  const summary = calculateSaleSummary(filteredSales);

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        label: "Tanggal",
        width: "150px",
        align: "center",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "saleNumber",
        label: "No Penjualan",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell" title={row.saleNumber || ""}>
            {row.saleNumber || "-"}
          </span>
        ),
      },
      {
        key: "customer",
        label: "Customer",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center purchase-supplier-cell">
            <strong>{row.customer?.name || row.customerName || "Walk-in Customer"}</strong>
            <span>{row.customer?.phone || row.customerPhone || "-"}</span>
          </div>
        ),
      },
      {
        key: "paymentStatus",
        label: "Status Bayar",
        width: "150px",
        align: "center",
        render: (row) => {
          const status = getSalePaymentStatusMeta(row.paymentStatus);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "paymentMethod",
        label: "Metode",
        width: "130px",
        align: "center",
        render: (row) => getPaymentMethodLabel(row.paymentMethod),
      },
      {
        key: "totalAmount",
        label: "Total",
        width: "170px",
        align: "center",
        render: (row) => formatCurrency(row.totalAmount),
      },
      {
        key: "paidAmount",
        label: "Dibayar",
        width: "170px",
        align: "center",
        render: (row) => formatCurrency(row.paidAmount),
      },
      {
        key: "remainingAmount",
        label: "Sisa",
        width: "170px",
        align: "center",
        render: (row) => (
          <strong className={Number(row.remainingAmount || 0) > 0 ? "text-danger" : ""}>
            {formatCurrency(row.remainingAmount)}
          </strong>
        ),
      },
    ],
    []
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Laporan Penjualan"
      description="Lihat rekap penjualan berdasarkan periode, status bayar, metode pembayaran, dan export laporan ke PDF atau Excel."
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate("/sales")}>
            <ArrowLeft size={17} />
            Kembali
          </Button>

          <Button
            className="purchase-report-excel-button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
          >
            <FileSpreadsheet size={17} />
            {isExportingExcel ? "Exporting..." : "Excel"}
          </Button>

          <Button
            className="purchase-report-pdf-button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            <Download size={17} />
            {isExportingPdf ? "Exporting..." : "PDF"}
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

            <select
              className="report-filter-select"
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
            >
            <option value="">Semua Status Bayar</option>
            <option value="PAID">Lunas</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="UNPAID">Belum Dibayar</option>
            </select>

          <select
              className="report-filter-select"
              name="paymentMethod"
              value={filters.paymentMethod}
              onChange={handleFilterChange}
            >
            <option value="">Semua Metode</option>
            <option value="CASH">Tunai</option>
            <option value="TRANSFER">Transfer</option>
            </select>

          <Button variant="secondary" size="sm" onClick={fetchReport}>
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

      <div className="purchase-report-header-card">
        <div>
          <FileBarChart size={22} />
        </div>

        <section>
          <span>Periode Laporan</span>
          <strong>{getPeriodLabel(filters)}</strong>
          <p>
            Data preview di bawah mengikuti filter periode, status bayar, metode
            pembayaran, dan pencarian yang dipilih. Export PDF dan Excel
            menggunakan filter yang sama.
          </p>
        </section>
      </div>

      <div className="purchase-report-summary-grid">
        <ReportSummaryCard
          tone="count"
          label="Jumlah Transaksi"
          value={summary.saleCount}
          helper="Total transaksi penjualan"
        />

        <ReportSummaryCard
          tone="purchase"
          label="Total Penjualan"
          value={formatCurrency(summary.totalAmount)}
          helper="Akumulasi nilai penjualan"
        />

        <ReportSummaryCard
          tone="paid"
          label="Total Dibayar"
          value={formatCurrency(summary.totalPaidAmount)}
          helper="Pembayaran yang sudah tercatat"
        />

        <ReportSummaryCard
          tone="remaining"
          label="Sisa Piutang"
          value={formatCurrency(summary.totalRemainingAmount)}
          helper="Tagihan penjualan belum lunas"
          danger={Number(summary.totalRemainingAmount || 0) > 0}
        />
      </div>

      <div className="purchase-report-summary-grid">
        <ReportSummaryCard
          tone="paid"
          label="Lunas"
          value={summary.byPaymentStatus.PAID}
          helper="Transaksi sudah lunas"
        />

        <ReportSummaryCard
          tone="remaining"
          label="Sebagian"
          value={summary.byPaymentStatus.PARTIAL}
          helper="Transaksi dibayar sebagian"
          danger={summary.byPaymentStatus.PARTIAL > 0}
        />

        <ReportSummaryCard
          tone="remaining"
          label="Belum Dibayar"
          value={summary.byPaymentStatus.UNPAID}
          helper="Transaksi belum ada pembayaran"
          danger={summary.byPaymentStatus.UNPAID > 0}
        />
      </div>

      <Table
        className="purchase-report-table"
        columns={columns}
        data={salesReportPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Laporan penjualan kosong"
        emptyDescription="Tidak ada data penjualan yang cocok dengan filter saat ini."
      />
      <Pagination
        page={salesReportPagination.currentPage}
        totalPages={salesReportPagination.totalPages}
        totalItems={salesReportPagination.totalItems}
        startItem={salesReportPagination.startItem}
        endItem={salesReportPagination.endItem}
        pageSize={salesReportPagination.pageSize}
        onPageChange={salesReportPagination.setCurrentPage}
      />
    </ListPageLayout>
  );
}

function ReportSummaryCard({
  tone = "neutral",
  label,
  value,
  helper,
  danger = false,
}) {
  return (
    <Card
      className={`purchase-report-summary-card purchase-report-summary-card-${tone}`}
    >
      <span>{label}</span>
      <strong className={danger ? "text-danger" : ""}>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function buildReportParams(filters, search) {
  const params = {};

  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom;
    params.startDate = filters.dateFrom;
  }

  if (filters.dateTo) {
    params.dateTo = filters.dateTo;
    params.endDate = filters.dateTo;
  }

  if (filters.paymentStatus) {
    params.paymentStatus = filters.paymentStatus;
  }

  if (filters.paymentMethod) {
    params.paymentMethod = filters.paymentMethod;
  }

  if (search?.trim()) {
    params.search = search.trim();
  }

  return params;
}

function calculateSaleSummary(sales) {
  return sales.reduce(
    (summary, sale) => {
      const totalAmount = toNumber(sale.totalAmount);
      const paidAmount = toNumber(sale.paidAmount);
      const remainingAmount = toNumber(sale.remainingAmount);
      const paymentStatus = sale.paymentStatus || "UNPAID";
      const paymentMethod = sale.paymentMethod || "CASH";

      return {
        saleCount: summary.saleCount + 1,
        totalAmount: summary.totalAmount + totalAmount,
        totalPaidAmount: summary.totalPaidAmount + paidAmount,
        totalRemainingAmount: summary.totalRemainingAmount + remainingAmount,
        byPaymentStatus: {
          ...summary.byPaymentStatus,
          [paymentStatus]: (summary.byPaymentStatus[paymentStatus] || 0) + 1,
        },
        byPaymentMethod: {
          ...summary.byPaymentMethod,
          [paymentMethod]: (summary.byPaymentMethod[paymentMethod] || 0) + 1,
        },
      };
    },
    {
      saleCount: 0,
      totalAmount: 0,
      totalPaidAmount: 0,
      totalRemainingAmount: 0,
      byPaymentStatus: {
        PAID: 0,
        PARTIAL: 0,
        UNPAID: 0,
      },
      byPaymentMethod: {
        CASH: 0,
        TRANSFER: 0,
      },
    }
  );
}

function getSalePaymentStatusMeta(status) {
  const statuses = {
    PAID: {
      label: "Lunas",
      tone: "success",
    },
    PARTIAL: {
      label: "Sebagian",
      tone: "warning",
    },
    UNPAID: {
      label: "Belum Dibayar",
      tone: "danger",
    },
  };

  return (
    statuses[status] || {
      label: status || "-",
      tone: "neutral",
    }
  );
}

function getPaymentMethodLabel(method) {
  const methods = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
  };

  return methods[method] || method || "-";
}

function toNumber(value) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPeriodLabel(filters) {
  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom === filters.dateTo) {
      return formatDate(`${filters.dateFrom}T00:00:00`);
    }

    return `${formatDate(`${filters.dateFrom}T00:00:00`)} - ${formatDate(
      `${filters.dateTo}T00:00:00`
    )}`;
  }

  if (filters.dateFrom) {
    return `Dari ${formatDate(`${filters.dateFrom}T00:00:00`)}`;
  }

  if (filters.dateTo) {
    return `Sampai ${formatDate(`${filters.dateTo}T00:00:00`)}`;
  }

  return "Semua Periode";
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

function getDefaultExportFileName(extension, filters) {
  const dateFrom = filters.dateFrom || "awal";
  const dateTo = filters.dateTo || "akhir";

  return `laporan-penjualan-${dateFrom}-${dateTo}.${extension}`;
}

export default SaleReportPage;