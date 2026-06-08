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
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import {
  downloadFile,
  getFileNameFromContentDisposition,
} from "../../utils/downloadFile";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { purchaseApi } from "./purchase.api";

function PurchaseReportPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [reportData, setReportData] = useState({
    purchases: [],
    summary: null,
    periodLabel: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const reportParams = useMemo(() => {
    return buildReportParams(filters);
  }, [filters]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await purchaseApi.getReport(reportParams);
      const responseData = response.data?.data || response.data;

      const report = responseData?.report || responseData || {};

      const purchases =
        report?.purchases ||
        responseData?.purchases ||
        responseData?.items ||
        responseData?.data ||
        [];

      const safePurchases = Array.isArray(purchases) ? purchases : [];

      const summary = calculatePurchaseSummary(safePurchases);

        setReportData({
        purchases: safePurchases,
        summary,
        periodLabel:
            report?.periodLabel ||
            responseData?.periodLabel ||
            getPeriodLabel(filters),
        });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setReportData({
        purchases: [],
        summary: calculatePurchaseSummary([]),
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

  const handleDateRangeChange = (value) => {
    setFilters({
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    });
  };

  const handleResetFilter = () => {
  setSearchInput("");

  setFilters({
    dateFrom: "",
    dateTo: "",
  });
};

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setErrorMessage("");

    try {
      const response = await purchaseApi.exportReportPdf(reportParams);

      const fileName =
        getFileNameFromContentDisposition(
          response.headers?.["content-disposition"]
        ) || getDefaultExportFileName("pdf", filters);

      downloadFile({
        blob: response.data,
        fileName,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setErrorMessage("");

    try {
      const response = await purchaseApi.exportReportExcel(reportParams);

      const fileName =
        getFileNameFromContentDisposition(
          response.headers?.["content-disposition"]
        ) || getDefaultExportFileName("xlsx", filters);

      downloadFile({
        blob: response.data,
        fileName,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const filteredPurchases = useMemo(() => {
  const keyword = debouncedSearch.trim().toLowerCase();

  return reportData.purchases.filter((purchase) => {
    const purchaseNumber = purchase.purchaseNumber || "";
    const supplierInvoiceNumber = purchase.supplierInvoiceNumber || "";
    const supplierName = purchase.supplier?.name || purchase.supplierName || "";

    const matchesSearch = keyword
      ? purchaseNumber.toLowerCase().includes(keyword) ||
        supplierInvoiceNumber.toLowerCase().includes(keyword) ||
        supplierName.toLowerCase().includes(keyword)
      : true;

    const matchesDate = isDateInRange(
      purchase.createdAt,
      filters.dateFrom,
      filters.dateTo
    );

    return matchesSearch && matchesDate;
  });
}, [reportData.purchases, debouncedSearch, filters.dateFrom, filters.dateTo]);

const summary = calculatePurchaseSummary(filteredPurchases);

const purchaseReportPagination = usePagination(filteredPurchases, {
  pageSize: 15,
});

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        label: "Tanggal",
        width: "160px",
        align: "center",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "purchaseNumber",
        label: "No Pembelian",
        width: "220px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell" title={row.purchaseNumber || ""}>
            {row.purchaseNumber || "-"}
          </span>
        ),
      },
      {
        key: "supplier",
        label: "Supplier",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center purchase-supplier-cell">
            <strong>{row.supplier?.name || row.supplierName || "-"}</strong>
            <span>{row.supplier?.phone || row.supplierPhone || "-"}</span>
          </div>
        ),
      },
      {
        key: "paymentStatus",
        label: "Status",
        width: "150px",
        align: "center",
        render: (row) => {
          const status = getPurchasePaymentStatusMeta(row);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
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
          <strong
            className={Number(row.remainingAmount || 0) > 0 ? "text-danger" : ""}
          >
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
      title="Laporan Pembelian"
      description="Lihat rekap pembelian berdasarkan periode dan export laporan ke PDF atau Excel."
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate("/purchases")}>
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
      onChange={setSearchInput}
      placeholder="Cari no pembelian, invoice, atau supplier..."
    />

    <DateRangeFilter
          value={{
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          }}
          onChange={handleDateRangeChange}
        />

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
            Data preview di bawah mengikuti filter periode yang dipilih. Export PDF
            dan Excel menggunakan filter yang sama.
          </p>
        </section>
      </div>

      <div className="purchase-report-summary-grid">
          <ReportSummaryCard
            tone="count"
            label="Jumlah Transaksi"
            value={summary.purchaseCount}
            helper="Total transaksi pembelian"
          />

          <ReportSummaryCard
            tone="purchase"
            label="Total Pembelian"
            value={formatCurrency(summary.totalAmount)}
            helper="Akumulasi nilai pembelian"
          />

          <ReportSummaryCard
            tone="paid"
            label="Total Dibayar"
            value={formatCurrency(summary.totalPaidAmount)}
            helper="Pembayaran yang sudah tercatat"
          />

          <ReportSummaryCard
            tone="remaining"
            label="Total Sisa"
            value={formatCurrency(summary.totalRemainingAmount)}
            helper="Sisa utang usaha pembelian"
            danger={Number(summary.totalRemainingAmount || 0) > 0}
          />
      </div>

      <Table
        className="purchase-report-table"
        columns={columns}
        data={purchaseReportPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Laporan pembelian kosong"
        emptyDescription="Tidak ada data pembelian yang cocok dengan filter saat ini."
      />
      <Pagination
        page={purchaseReportPagination.currentPage}
        totalPages={purchaseReportPagination.totalPages}
        totalItems={purchaseReportPagination.totalItems}
        startItem={purchaseReportPagination.startItem}
        endItem={purchaseReportPagination.endItem}
        pageSize={purchaseReportPagination.pageSize}
        onPageChange={purchaseReportPagination.setCurrentPage}
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

function buildReportParams(filters) {
  const params = {};

  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom;
    params.startDate = filters.dateFrom;
  }

  if (filters.dateTo) {
    params.dateTo = filters.dateTo;
    params.endDate = filters.dateTo;
  }

  return params;
}

function calculatePurchaseSummary(purchases) {
  return purchases.reduce(
    (summary, purchase) => {
      const totalAmount = toNumber(purchase.totalAmount);
      const paidAmount = toNumber(purchase.paidAmount);
      const remainingAmount = toNumber(purchase.remainingAmount);

      return {
        purchaseCount: summary.purchaseCount + 1,
        totalAmount: summary.totalAmount + totalAmount,
        totalPaidAmount: summary.totalPaidAmount + paidAmount,
        totalRemainingAmount: summary.totalRemainingAmount + remainingAmount,
      };
    },
    {
      purchaseCount: 0,
      totalAmount: 0,
      totalPaidAmount: 0,
      totalRemainingAmount: 0,
    }
  );
}

function toNumber(value) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPurchasePaymentStatusMeta(purchase) {
  const remainingAmount = Number(purchase?.remainingAmount || 0);
  const paidAmount = Number(purchase?.paidAmount || 0);

  if (remainingAmount <= 0) {
    return {
      label: "Lunas",
      tone: "success",
    };
  }

  if (paidAmount > 0) {
    return {
      label: "Sebagian",
      tone: "warning",
    };
  }

  return {
    label: "Belum Lunas",
    tone: "danger",
  };
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

  return `laporan-pembelian-${dateFrom}-${dateTo}.${extension}`;
}

export default PurchaseReportPage;