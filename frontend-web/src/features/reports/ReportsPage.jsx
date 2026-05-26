import {
  BarChart3,
  CalendarClock,
  FileSpreadsheet,
  FileText,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pagination from "../../components/UI/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import {
  downloadBlobResponse,
  openPdfBlobResponse,
  reportApi,
} from "./report.api";

const reportTabs = [
  {
    key: "profit-loss",
    label: "Laba Rugi",
  },
  {
    key: "cash-flow",
    label: "Arus Kas",
  },
  {
    key: "balance-sheet",
    label: "Neraca",
  },
];

function ReportsPage() {
  const [activeTab, setActiveTab] = useState("profit-loss");

  const [filters, setFilters] = useState({
    dateFrom: getCurrentMonthStartDate(),
    dateTo: getTodayInputDate(),
  });

  const [profitLossReport, setProfitLossReport] = useState(null);
  const [cashFlowReport, setCashFlowReport] = useState(null);
  const [balanceSheetReport, setBalanceSheetReport] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const periodParams = useMemo(() => {
    const params = {};

    if (filters.dateFrom) {
      params.startDate = filters.dateFrom;
    }

    if (filters.dateTo) {
      params.endDate = filters.dateTo;
    }

    return params;
  }, [filters.dateFrom, filters.dateTo]);

  const balanceSheetParams = useMemo(() => {
    const params = {};

    if (filters.dateTo) {
      params.endDate = filters.dateTo;
    }

    return params;
  }, [filters.dateTo]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [profitLossResponse, cashFlowResponse, balanceSheetResponse] =
        await Promise.all([
          reportApi.getProfitLoss(periodParams),
          reportApi.getCashFlow(periodParams),
          reportApi.getBalanceSheet(balanceSheetParams),
        ]);

      setProfitLossReport(getReportData(profitLossResponse));
      setCashFlowReport(getReportData(cashFlowResponse));
      setBalanceSheetReport(getReportData(balanceSheetResponse));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setProfitLossReport(null);
      setCashFlowReport(null);
      setBalanceSheetReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [balanceSheetParams, periodParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchReports();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchReports]);

  const profitLossRows = useMemo(() => {
    return buildProfitLossRows(profitLossReport);
  }, [profitLossReport]);

  const cashFlowRows = useMemo(() => {
    return Array.isArray(cashFlowReport?.movements)
      ? cashFlowReport.movements
      : [];
  }, [cashFlowReport]);

  const balanceSheetRows = useMemo(() => {
    return buildBalanceSheetRows(balanceSheetReport);
  }, [balanceSheetReport]);

  const activeRows = useMemo(() => {
    if (activeTab === "profit-loss") {
      return profitLossRows;
    }

    if (activeTab === "cash-flow") {
      return cashFlowRows;
    }

    return balanceSheetRows;
  }, [activeTab, balanceSheetRows, cashFlowRows, profitLossRows]);

  const reportPagination = usePagination(activeRows, {
    pageSize: 15,
    resetKey: `${activeTab}|${filters.dateFrom}|${filters.dateTo}`,
  });

  const activeColumns = useMemo(() => {
    if (activeTab === "profit-loss") {
      return getProfitLossColumns();
    }

    if (activeTab === "cash-flow") {
      return getCashFlowColumns();
    }

    return getBalanceSheetColumns();
  }, [activeTab]);

  const handleDateRangeChange = (value) => {
    setFilters((current) => ({
      ...current,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
  };

  const handleExport = async (type) => {
    setIsExporting(type);
    setErrorMessage("");

    try {
      if (activeTab === "profit-loss" && type === "excel") {
        const response = await reportApi.exportProfitLossExcel(periodParams);
        downloadBlobResponse(response, "laporan-laba-rugi.xlsx");
      }

      if (activeTab === "profit-loss" && type === "pdf") {
        const response = await reportApi.exportProfitLossPdf(periodParams);
        openPdfBlobResponse(response);
      }

      if (activeTab === "cash-flow" && type === "excel") {
        const response = await reportApi.exportCashFlowExcel(periodParams);
        downloadBlobResponse(response, "laporan-arus-kas.xlsx");
      }

      if (activeTab === "cash-flow" && type === "pdf") {
        const response = await reportApi.exportCashFlowPdf(periodParams);
        openPdfBlobResponse(response);
      }

      if (activeTab === "balance-sheet" && type === "excel") {
        const response =
          await reportApi.exportBalanceSheetExcel(balanceSheetParams);
        downloadBlobResponse(response, "laporan-neraca.xlsx");
      }

      if (activeTab === "balance-sheet" && type === "pdf") {
        const response = await reportApi.exportBalanceSheetPdf(balanceSheetParams);
        openPdfBlobResponse(response);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsExporting("");
    }
  };

  return (
    <ListPageLayout
      eyebrow=""
      title="Laporan Keuangan"
      description="Pantau laba rugi, arus kas, dan neraca berdasarkan data jurnal accounting yang sudah ter-posting."
      actions={
        <>
         <Button
            variant="secondary"
            className="report-export-button report-export-button-pdf"
            onClick={() => handleExport("pdf")}
            disabled={Boolean(isExporting) || isLoading}
            >
            <FileText size={16} />
            {isExporting === "pdf" ? "Membuka PDF..." : "Export PDF"}
            </Button>

            <Button
            variant="primary"
            className="report-export-button report-export-button-excel"
            onClick={() => handleExport("excel")}
            disabled={Boolean(isExporting) || isLoading}
            >
            <FileSpreadsheet size={16} />
            {isExporting === "excel" ? "Download..." : "Export Excel"}
            </Button>
        </>
      }
      filters={
        <FilterBar>
          <DateRangeFilter
            value={{
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            }}
            onChange={handleDateRangeChange}
          />

          <Button variant="secondary" size="sm" onClick={fetchReports}>
            <RefreshCcw size={15} />
            Refresh
          </Button>
        </FilterBar>
      }
    >
      {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}

      <div className="financial-report-tabs">
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={
              activeTab === tab.key
                ? "financial-report-tab is-active"
                : "financial-report-tab"
            }
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profit-loss" ? (
        <ProfitLossSummary report={profitLossReport} />
      ) : null}

      {activeTab === "cash-flow" ? (
        <CashFlowSummary report={cashFlowReport} />
      ) : null}

      {activeTab === "balance-sheet" ? (
        <BalanceSheetSummary report={balanceSheetReport} />
      ) : null}

      <Table
        className="cash-bank-list-table"
        columns={activeColumns}
        data={reportPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Laporan belum tersedia"
        emptyDescription="Belum ada data laporan yang cocok dengan periode saat ini."
      />

      <Pagination
        page={reportPagination.currentPage}
        totalPages={reportPagination.totalPages}
        totalItems={reportPagination.totalItems}
        startItem={reportPagination.startItem}
        endItem={reportPagination.endItem}
        pageSize={reportPagination.pageSize}
        onPageChange={reportPagination.setCurrentPage}
      />
    </ListPageLayout>
  );
}

function ProfitLossSummary({ report }) {
  const summary = report?.summary || {};

  return (
    <div className="cash-bank-summary-grid">
      <ReportSummaryCard
        tone="count"
        icon={<TrendingUp size={20} />}
        label="Total Pendapatan"
        value={formatCurrency(summary.totalRevenue || 0)}
        helper="Akumulasi revenue"
      />

      <ReportSummaryCard
        tone="bank"
        icon={<BarChart3 size={20} />}
        label="Laba Kotor"
        value={formatCurrency(summary.grossProfit || 0)}
        helper="Pendapatan dikurangi HPP"
      />

      <ReportSummaryCard
        tone="total"
        icon={<TrendingDown size={20} />}
        label="Total Beban"
        value={formatCurrency(summary.totalExpense || 0)}
        helper="Expense operasional"
      />

      <ReportSummaryCard
        tone={(summary.netProfit || 0) >= 0 ? "cash" : "total"}
        icon={<WalletCards size={20} />}
        label="Laba Bersih"
        value={formatCurrency(summary.netProfit || 0)}
        helper="Hasil akhir periode"
      />
    </div>
  );
}

function CashFlowSummary({ report }) {
  const summary = report?.summary || {};

  return (
    <div className="cash-bank-summary-grid">
      <ReportSummaryCard
        tone="cash"
        icon={<TrendingUp size={20} />}
        label="Kas Masuk"
        value={formatCurrency(summary.totalCashInflow || 0)}
        helper="Total inflow"
      />

      <ReportSummaryCard
        tone="total"
        icon={<TrendingDown size={20} />}
        label="Kas Keluar"
        value={formatCurrency(summary.totalCashOutflow || 0)}
        helper="Total outflow"
      />

      <ReportSummaryCard
        tone={(summary.netCashFlow || 0) >= 0 ? "bank" : "total"}
        icon={<WalletCards size={20} />}
        label="Arus Kas Bersih"
        value={formatCurrency(summary.netCashFlow || 0)}
        helper="Inflow dikurangi outflow"
      />

      <ReportSummaryCard
        tone="count"
        icon={<CalendarClock size={20} />}
        label="Mutasi"
        value={Array.isArray(report?.movements) ? report.movements.length : 0}
        helper="Jumlah pergerakan kas"
      />
    </div>
  );
}

function BalanceSheetSummary({ report }) {
  const summary = report?.summary || {};
  const balanceDifference = Number(summary.balanceDifference || 0);

  return (
    <div className="cash-bank-summary-grid">
      <ReportSummaryCard
        tone="cash"
        icon={<WalletCards size={20} />}
        label="Total Aset"
        value={formatCurrency(summary.totalAssets || 0)}
        helper="Aset sampai tanggal"
      />

      <ReportSummaryCard
        tone="bank"
        icon={<BarChart3 size={20} />}
        label="Total Kewajiban"
        value={formatCurrency(summary.totalLiabilities || 0)}
        helper="Liabilitas"
      />

      <ReportSummaryCard
        tone="count"
        icon={<TrendingUp size={20} />}
        label="Total Ekuitas"
        value={formatCurrency(summary.totalEquity || 0)}
        helper="Modal + laba berjalan"
      />

      <ReportSummaryCard
        tone={balanceDifference === 0 ? "cash" : "total"}
        icon={<FileText size={20} />}
        label="Selisih Neraca"
        value={formatCurrency(balanceDifference)}
        helper={balanceDifference === 0 ? "Balance" : "Perlu dicek"}
      />
    </div>
  );
}

function ReportSummaryCard({ tone = "count", icon, label, value, helper }) {
  return (
    <Card className={`cash-bank-summary-card cash-bank-summary-card-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function getProfitLossColumns() {
  return [
    {
      key: "category",
      label: "Kategori",
      width: "190px",
      align: "center",
      render: (row) => row.category,
    },
    {
      key: "accountCode",
      label: "Kode Akun",
      width: "140px",
      align: "center",
      render: (row) => row.accountCode || "-",
    },
    {
      key: "accountName",
      label: "Nama Akun",
      width: "280px",
      align: "center",
      render: (row) => (
        <div className="table-main-text is-center">
          <strong>{row.accountName || "-"}</strong>
        </div>
      ),
    },
    {
      key: "debit",
      label: "Debit",
      width: "170px",
      align: "center",
      render: (row) => formatCurrency(row.debit || 0),
    },
    {
      key: "credit",
      label: "Credit",
      width: "170px",
      align: "center",
      render: (row) => formatCurrency(row.credit || 0),
    },
    {
      key: "balance",
      label: "Saldo",
      width: "180px",
      align: "center",
      render: (row) => <strong>{formatCurrency(row.balance || 0)}</strong>,
    },
  ];
}

function getCashFlowColumns() {
  return [
    {
      key: "entryDate",
      label: "Tanggal",
      width: "150px",
      align: "center",
      render: (row) => formatDate(row.entryDate),
    },
    {
      key: "entryNumber",
      label: "No Jurnal",
      width: "220px",
      align: "center",
      render: (row) => (
        <span className="purchase-number-cell">{row.entryNumber || "-"}</span>
      ),
    },
    {
      key: "sourceType",
      label: "Sumber",
      width: "160px",
      align: "center",
      render: (row) => row.sourceType || "-",
    },
    {
      key: "account",
      label: "Akun",
      width: "260px",
      align: "center",
      render: (row) => (
        <div className="table-main-text is-center">
          <strong>
            {row.accountCode || "-"} - {row.accountName || "-"}
          </strong>
          <span>{row.description || "-"}</span>
        </div>
      ),
    },
    {
      key: "inflow",
      label: "Kas Masuk",
      width: "170px",
      align: "center",
      render: (row) => <strong>{formatCurrency(row.inflow || 0)}</strong>,
    },
    {
      key: "outflow",
      label: "Kas Keluar",
      width: "170px",
      align: "center",
      render: (row) => <strong>{formatCurrency(row.outflow || 0)}</strong>,
    },
    {
      key: "netChange",
      label: "Perubahan",
      width: "170px",
      align: "center",
      render: (row) => <strong>{formatCurrency(row.netChange || 0)}</strong>,
    },
    {
      key: "note",
      label: "Catatan",
      width: "220px",
      align: "center",
      render: (row) => row.note || "-",
    },
  ];
}

function getBalanceSheetColumns() {
  return [
    {
      key: "category",
      label: "Kategori",
      width: "180px",
      align: "center",
      render: (row) => row.category || "-",
    },
    {
      key: "accountCode",
      label: "Kode Akun",
      width: "140px",
      align: "center",
      render: (row) => row.accountCode || "-",
    },
    {
      key: "accountName",
      label: "Nama Akun",
      width: "300px",
      align: "center",
      render: (row) => (
        <div className="table-main-text is-center">
          <strong>{row.accountName || "-"}</strong>
        </div>
      ),
    },
    {
      key: "debit",
      label: "Debit",
      width: "170px",
      align: "center",
      render: (row) =>
        row.debit === "" ? "-" : formatCurrency(row.debit || 0),
    },
    {
      key: "credit",
      label: "Credit",
      width: "170px",
      align: "center",
      render: (row) =>
        row.credit === "" ? "-" : formatCurrency(row.credit || 0),
    },
    {
      key: "balance",
      label: "Saldo",
      width: "190px",
      align: "center",
      render: (row) => <strong>{formatCurrency(row.balance || 0)}</strong>,
    },
  ];
}

function buildProfitLossRows(report) {
  if (!report) {
    return [];
  }

  return [
    ...mapAccountRows("Pendapatan", report.revenueAccounts),
    ...mapAccountRows("Harga Pokok Penjualan", report.cogsAccounts),
    ...mapAccountRows("Beban Operasional", report.expenseAccounts),
  ];
}

function buildBalanceSheetRows(report) {
  if (!report) {
    return [];
  }

  return [
    ...mapAccountRows("Aset", report.assets),
    ...mapAccountRows("Kewajiban", report.liabilities),
    ...mapAccountRows("Ekuitas", report.equities),
    {
      id: "current-period-profit",
      category: "Ekuitas",
      accountCode: "-",
      accountName: "Laba/Rugi Periode Berjalan",
      debit: "",
      credit: "",
      balance: report.summary?.currentPeriodProfit || 0,
    },
  ];
}

function mapAccountRows(category, accounts = []) {
  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts.map((account, index) => ({
    id: `${category}-${account.accountCode || index}`,
    category,
    accountCode: account.accountCode,
    accountName: account.accountName,
    debit: account.debit,
    credit: account.credit,
    balance: account.balance,
  }));
}

function getReportData(response) {
  return response.data?.data || response.data || null;
}

function getTodayInputDate() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 10);
}

function getCurrentMonthStartDate() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const offsetDate = new Date(
    firstDay.getTime() - firstDay.getTimezoneOffset() * 60000
  );

  return offsetDate.toISOString().slice(0, 10);
}

export default ReportsPage;