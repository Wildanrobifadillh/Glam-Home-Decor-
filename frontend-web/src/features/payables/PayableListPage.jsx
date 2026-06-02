import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCcw,
  Save,
  SearchCheck,
  Truck,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Pagination from "../../components/ui/Pagination";
import Table from "../../components/ui/Table";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { payableApi } from "../receivables/payable.api";

function PayableListPage() {
  const [payables, setPayables] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    paymentStatus: "",
    agingBucket: "",
  });

  const [selectedPayable, setSelectedPayable] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    note: "",
  });

  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] =
    useState(false);
  const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const payableParams = useMemo(() => {
    const params = {};

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (filters.paymentStatus) {
      params.paymentStatus = filters.paymentStatus;
    }

    return params;
  }, [debouncedSearch, filters.paymentStatus]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter(
      (account) => account.isActive !== false && account.status !== "INACTIVE"
    );
  }, [cashBankAccounts]);

  const effectiveCashBankAccount = useMemo(() => {
    const accountId = getDefaultCashBankAccountId(
      activeCashBankAccounts,
      paymentForm.paymentMethod
    );

    return activeCashBankAccounts.find((account) => account.id === accountId);
  }, [activeCashBankAccounts, paymentForm.paymentMethod]);

  const effectiveCashBankAccountId = effectiveCashBankAccount?.id || "";
  const effectiveCashBankAccountLabel =
    getCashBankAccountLabel(effectiveCashBankAccount);

  const fetchPayables = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [payableResponse, cashBankResponse] = await Promise.all([
        payableApi.getList(payableParams),
        cashBankApi.getList(),
      ]);

      const payableData = payableResponse.data?.data || payableResponse.data;
      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;

      const payableList = Array.isArray(payableData?.payables)
        ? payableData.payables
        : Array.isArray(payableData)
          ? payableData
          : [];

      const cashBankList = Array.isArray(cashBankData?.cashBankAccounts)
        ? cashBankData.cashBankAccounts
        : Array.isArray(cashBankData?.accounts)
          ? cashBankData.accounts
          : Array.isArray(cashBankData)
            ? cashBankData
            : [];

      setPayables(payableList);
      setCashBankAccounts(cashBankList);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPayables([]);
      setCashBankAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [payableParams]);

  const fetchPayableDetail = useCallback(async (purchaseId) => {
    const response = await payableApi.getByPurchaseId(purchaseId);
    const responseData = response.data?.data || response.data;
    const payable = responseData?.payable || responseData;

    setSelectedPayable(payable || null);

    return payable || null;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchPayables();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchPayables]);

  const handleDateRangeChange = (value) => {
    setFilters((current) => ({
      ...current,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
    setCurrentPage(1);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchInput("");

    setFilters({
      dateFrom: "",
      dateTo: "",
      paymentStatus: "",
      agingBucket: "",
    });
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const handleOpenDetail = useCallback(
    async (row, event) => {
      event?.preventDefault();
      event?.stopPropagation();

      setIsDetailModalOpen(true);
      setIsDetailLoading(true);
      setSelectedPayable(null);
      setErrorMessage("");

      try {
        await fetchPayableDetail(row.id);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [fetchPayableDetail]
  );

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedPayable(null);
    setIsPaymentModalOpen(false);
  };

  const handleOpenPaymentModal = () => {
    const remainingAmount = Number(selectedPayable?.remainingAmount || 0);

    setPaymentForm({
      amount: remainingAmount > 0 ? formatPaymentAmountInput(remainingAmount) : "",
      paymentMethod: "CASH",
      note: "",
    });

    setErrorMessage("");
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handlePaymentFormChange = (event) => {
    const { name, value } = event.target;

    setPaymentForm((current) => {
      if (name === "amount") {
        return {
          ...current,
          amount: formatPaymentAmountInput(value),
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmitPayment = (event) => {
    event.preventDefault();

    if (!selectedPayable) {
      setErrorMessage("Data hutang belum dipilih.");
      return;
    }

    const amount = parsePaymentAmountInput(paymentForm.amount);
    const remainingAmount = Number(selectedPayable.remainingAmount || 0);

    if (amount <= 0) {
      setErrorMessage("Nominal pembayaran harus lebih dari 0.");
      return;
    }

    if (amount > remainingAmount) {
      setErrorMessage("Nominal pembayaran tidak boleh melebihi sisa hutang.");
      return;
    }

    if (!effectiveCashBankAccountId) {
      setErrorMessage("Akun kas/bank otomatis belum tersedia.");
      return;
    }

    setErrorMessage("");
    setIsPaymentConfirmModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayable) {
      setIsPaymentConfirmModalOpen(false);
      return;
    }

    const purchaseId = selectedPayable.id;
    const amount = parsePaymentAmountInput(paymentForm.amount);

    setIsSubmittingPayment(true);
    setErrorMessage("");

    try {
      await payableApi.payPurchase(purchaseId, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        cashBankAccountId: effectiveCashBankAccountId,
        note: paymentForm.note.trim() || undefined,
      });

      await fetchPayables();
      await fetchPayableDetail(purchaseId);

      setIsPaymentConfirmModalOpen(false);
      setIsPaymentModalOpen(false);
      setIsPaymentSuccessModalOpen(true);
    } catch (error) {
      setIsPaymentConfirmModalOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const filteredPayables = useMemo(() => {
    return payables.filter((payable) => {
      const matchesDate = isDateInRange(
        payable.createdAt,
        filters.dateFrom,
        filters.dateTo
      );

      const matchesAging = filters.agingBucket
        ? payable.agingBucket === filters.agingBucket
        : true;

      return matchesDate && matchesAging;
    });
  }, [payables, filters.dateFrom, filters.dateTo, filters.agingBucket]);

  const summary = useMemo(() => {
    return filteredPayables.reduce(
      (current, item) => {
        const remainingAmount = Number(item.remainingAmount || 0);
        const totalAmount = Number(item.totalAmount || 0);
        const paidAmount = Number(item.paidAmount || 0);

        return {
          invoiceCount: current.invoiceCount + 1,
          activeCount: current.activeCount + (remainingAmount > 0 ? 1 : 0),
          totalInvoiceAmount: current.totalInvoiceAmount + totalAmount,
          totalPaidAmount: current.totalPaidAmount + paidAmount,
          totalRemainingAmount: current.totalRemainingAmount + remainingAmount,
        };
      },
      {
        invoiceCount: 0,
        activeCount: 0,
        totalInvoiceAmount: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
      }
    );
  }, [filteredPayables]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedPayables,
    startItem,
    endItem,
    totalItems,
    setCurrentPage,
  } = usePagination(filteredPayables, {
    pageSize: 15,
    resetKey: JSON.stringify({
      search: debouncedSearch,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      paymentStatus: filters.paymentStatus,
      agingBucket: filters.agingBucket,
    }),
  });

  const paymentHistory = useMemo(() => {
    return Array.isArray(selectedPayable?.payablePayments)
      ? selectedPayable.payablePayments
      : [];
  }, [selectedPayable]);

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        label: "Tanggal",
        width: "145px",
        align: "center",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "purchaseNumber",
        label: "No Pembelian",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">
            {row.purchaseNumber || "-"}
          </span>
        ),
      },
      {
        key: "supplier",
        label: "Supplier",
        width: "250px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.supplier?.name || row.supplierName || "-"}</strong>
            <span>{row.supplier?.phone || row.supplierPhone || "-"}</span>
          </div>
        ),
      },
      {
        key: "paymentStatus",
        label: "Status",
        width: "140px",
        align: "center",
        render: (row) => {
          const status = getPaymentStatusMeta(row.paymentStatus);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "agingBucket",
        label: "Aging",
        width: "130px",
        align: "center",
        render: (row) => {
          const aging = getAgingMeta(row.agingBucket);

          return <Badge tone={aging.tone}>{aging.label}</Badge>;
        },
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
        label: "Sisa Hutang",
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
      {
        key: "daysOutstanding",
        label: "Umur",
        width: "120px",
        align: "center",
        render: (row) =>
          Number(row.remainingAmount || 0) > 0
            ? `${row.daysOutstanding || 0} hari`
            : "-",
      },
      {
        key: "actions",
        label: "Aksi",
        width: "130px",
        align: "center",
        render: (row) => (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(event) => handleOpenDetail(row, event)}
          >
            <Eye size={14} />
            Detail
          </Button>
        ),
      },
    ],
    [handleOpenDetail]
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Hutang"
      description="Pantau tagihan supplier, sisa hutang, umur hutang, dan status pembayaran."
      actions={null}
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari no pembelian, invoice, atau supplier..."
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
            <option value="UNPAID">Belum Dibayar</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="PAID">Lunas</option>
          </select>

          <select
            className="report-filter-select"
            name="agingBucket"
            value={filters.agingBucket}
            onChange={handleFilterChange}
          >
            <option value="">Semua Aging</option>
            <option value="0-30">0-30 Hari</option>
            <option value="31-60">31-60 Hari</option>
            <option value="61-90">61-90 Hari</option>
            <option value="90+">90+ Hari</option>
            <option value="PAID">Lunas</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPayables}
            disabled={isLoading}
          >
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

      <div className="receivable-summary-grid">
        <FinanceSummaryCard
          tone="count"
          icon={<SearchCheck size={20} />}
          label="Jumlah Invoice"
          value={summary.invoiceCount}
          helper="Invoice sesuai filter"
        />

        <FinanceSummaryCard
          tone="active"
          icon={<AlertCircle size={20} />}
          label="Hutang Aktif"
          value={summary.activeCount}
          helper="Masih memiliki sisa tagihan"
        />

        <FinanceSummaryCard
          tone="sales"
          icon={<Truck size={20} />}
          label="Total Pembelian"
          value={formatCurrency(summary.totalInvoiceAmount)}
          helper="Total nilai tagihan supplier"
        />

        <FinanceSummaryCard
          tone="remaining"
          icon={<CalendarClock size={20} />}
          label="Sisa Hutang"
          value={formatCurrency(summary.totalRemainingAmount)}
          helper="Belum dibayarkan ke supplier"
          danger={summary.totalRemainingAmount > 0}
        />
      </div>

      <Table
        className="receivable-list-table"
        columns={columns}
        data={paginatedPayables}
        isLoading={isLoading}
        emptyTitle="Hutang belum tersedia"
        emptyDescription="Belum ada data hutang yang cocok dengan filter saat ini."
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

      {isDetailModalOpen
        ? createPortal(
            <div className="receivable-detail-backdrop">
              <div className="receivable-detail-modal">
                <div className="receivable-detail-header">
                  <div>
                    <span>Detail Hutang</span>
                    <strong>{selectedPayable?.purchaseNumber || "-"}</strong>
                    <p>
                      {selectedPayable?.createdAt
                        ? `Tanggal ${formatDate(selectedPayable.createdAt)}`
                        : "Memuat detail hutang..."}
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseDetail}>
                    <X size={20} />
                  </button>
                </div>

                {isDetailLoading ? (
                  <div className="return-empty-state">Memuat detail hutang...</div>
                ) : null}

                {!isDetailLoading && selectedPayable ? (
                  <>
                    <div className="receivable-detail-summary">
                      <div>
                        <span>Supplier</span>
                        <strong>
                          {selectedPayable.supplier?.name ||
                            selectedPayable.supplierName ||
                            "-"}
                        </strong>
                        <p>
                          {selectedPayable.supplier?.phone ||
                            selectedPayable.supplierPhone ||
                            "-"}
                        </p>
                      </div>

                      <div>
                        <span>Total Pembelian</span>
                        <strong>{formatCurrency(selectedPayable.totalAmount)}</strong>
                      </div>

                      <div>
                        <span>Dibayar</span>
                        <strong>{formatCurrency(selectedPayable.paidAmount)}</strong>
                      </div>

                      <div>
                        <span>Sisa Hutang</span>
                        <strong
                          className={
                            Number(selectedPayable.remainingAmount || 0) > 0
                              ? "text-danger"
                              : ""
                          }
                        >
                          {formatCurrency(selectedPayable.remainingAmount)}
                        </strong>
                      </div>

                      <div>
                        <span>Aging</span>
                        <strong>{selectedPayable.agingBucket || "-"}</strong>
                        <p>
                          {Number(selectedPayable.remainingAmount || 0) > 0
                            ? `${selectedPayable.daysOutstanding || 0} hari`
                            : "Lunas"}
                        </p>
                      </div>
                    </div>

                    <div className="receivable-detail-section">
                      <div className="return-section-title">
                        <WalletCards size={18} />
                        <span>Riwayat Pembayaran</span>
                      </div>

                      {paymentHistory.length ? (
                        <div className="receivable-payment-history">
                          {paymentHistory.map((payment) => (
                            <div
                              className="receivable-payment-history-item"
                              key={payment.id}
                            >
                              <div>
                                <span>Tanggal</span>
                                <strong>{formatDate(payment.createdAt)}</strong>
                              </div>

                              <div>
                                <span>Nominal</span>
                                <strong>{formatCurrency(payment.amount)}</strong>
                              </div>

                              <div>
                                <span>Metode</span>
                                <strong>
                                  {getPaymentMethodLabel(payment.paymentMethod)}
                                </strong>
                                <p>
                                  {payment.cashBankAccount?.name ||
                                    payment.cashBankAccount?.bankName ||
                                    "-"}
                                </p>
                              </div>

                              <div>
                                <span>Catatan</span>
                                <strong>{payment.note || "-"}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="return-empty-state">
                          Belum ada riwayat pembayaran.
                        </div>
                      )}
                    </div>

                    <div className="receivable-detail-footer">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCloseDetail}
                      >
                        Tutup
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleOpenPaymentModal}
                        disabled={Number(selectedPayable.remainingAmount || 0) <= 0}
                      >
                        <Save size={15} />
                        {Number(selectedPayable.remainingAmount || 0) > 0
                          ? "Bayar Hutang"
                          : "Sudah Lunas"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {isPaymentModalOpen
        ? createPortal(
            <div className="receivable-detail-backdrop">
              <form
                className="receivable-payment-modal"
                onSubmit={handleSubmitPayment}
              >
                <div className="receivable-detail-header">
                  <div>
                    <span>Pembayaran Hutang</span>
                    <strong>{selectedPayable?.purchaseNumber || "-"}</strong>
                    <p>
                      Sisa hutang {formatCurrency(selectedPayable?.remainingAmount)}
                    </p>
                  </div>

                  <button type="button" onClick={handleClosePaymentModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="receivable-payment-form">
                  <label>
                    Nominal Bayar
                    <input
                      name="amount"
                      type="text"
                      inputMode="numeric"
                      value={paymentForm.amount}
                      onChange={handlePaymentFormChange}
                      placeholder="0"
                    />
                  </label>

                  <label>
                    Metode Bayar
                    <select
                      name="paymentMethod"
                      value={paymentForm.paymentMethod}
                      onChange={handlePaymentFormChange}
                    >
                      <option value="CASH">Tunai</option>
                      <option value="TRANSFER">Transfer</option>
                    </select>
                  </label>

                  <label className="is-full">
                    Akun Kas/Bank
                    <input value={effectiveCashBankAccountLabel} readOnly />
                  </label>

                  <label className="is-full">
                    Catatan
                    <textarea
                      name="note"
                      value={paymentForm.note}
                      onChange={handlePaymentFormChange}
                      placeholder="Catatan pembayaran..."
                      rows={4}
                    />
                  </label>
                </div>

                <div className="receivable-detail-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClosePaymentModal}
                    disabled={isSubmittingPayment}
                  >
                    Batal
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingPayment}
                  >
                    <CheckCircle2 size={15} />
                    Simpan Pembayaran
                  </Button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {isPaymentConfirmModalOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmittingPayment ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses pembayaran...</h2>

                    <p>
                      Sistem sedang mencatat pembayaran hutang, memperbarui sisa
                      tagihan supplier, dan membuat jurnal pembayaran.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Yakin ingin mencatat pembayaran?</h2>

                    <p>
                      Pembayaran ini akan mengurangi sisa hutang supplier dan
                      mencatat kas/bank sesuai metode yang dipilih.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Nominal Bayar</span>
                        <strong>
                          {formatCurrency(
                            parsePaymentAmountInput(paymentForm.amount)
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Metode</span>
                        <strong>
                          {getPaymentMethodLabel(paymentForm.paymentMethod)}
                        </strong>
                      </div>

                      <div>
                        <span>Akun</span>
                        <strong>{effectiveCashBankAccountLabel}</strong>
                      </div>
                    </div>

                    <div className="return-confirm-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsPaymentConfirmModalOpen(false)}
                        disabled={isSubmittingPayment}
                      >
                        Tidak
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmPayment}
                        disabled={isSubmittingPayment}
                      >
                        Ya, Simpan
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {isPaymentSuccessModalOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal return-success-modal">
                <div className="return-confirm-icon is-success">
                  <CheckCircle2 size={42} />
                </div>

                <h2>Pembayaran hutang berhasil dicatat</h2>

                <p>
                  Sisa hutang supplier sudah diperbarui dan pembayaran berhasil
                  dicatat dari kas/bank.
                </p>

                <div className="return-confirm-actions is-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsPaymentSuccessModalOpen(false)}
                  >
                    Selesai
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </ListPageLayout>
  );
}

function FinanceSummaryCard({
  tone = "neutral",
  icon,
  label,
  value,
  helper,
  danger = false,
}) {
  return (
    <Card className={`receivable-summary-card receivable-summary-card-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong className={danger ? "text-danger" : ""}>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function getPaymentStatusMeta(status) {
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

function getAgingMeta(bucket) {
  const aging = {
    "0-30": {
      label: "0-30 Hari",
      tone: "success",
    },
    "31-60": {
      label: "31-60 Hari",
      tone: "warning",
    },
    "61-90": {
      label: "61-90 Hari",
      tone: "danger",
    },
    "90+": {
      label: "90+ Hari",
      tone: "danger",
    },
    PAID: {
      label: "Lunas",
      tone: "success",
    },
  };

  return (
    aging[bucket] || {
      label: bucket || "-",
      tone: "neutral",
    }
  );
}

function getPaymentMethodLabel(method) {
  const labels = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
  };

  return labels[method] || method || "-";
}

function getDefaultCashBankAccountId(accounts, method = "CASH") {
  const normalizedMethod = String(method || "CASH").toUpperCase();

  const cashKeywords = ["kas", "cash", "tunai"];
  const bankKeywords = [
    "bank",
    "rekening",
    "bca",
    "bri",
    "bni",
    "mandiri",
    "transfer",
  ];

  const keywords =
    normalizedMethod === "TRANSFER" ? bankKeywords : cashKeywords;

  const matchedAccount = accounts?.find((account) => {
    const searchableText = [
      account.name,
      account.bankName,
      account.accountName,
      account.accountNumber,
      account.type,
      account.accountType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) => searchableText.includes(keyword));
  });

  return matchedAccount?.id || accounts?.[0]?.id || "";
}

function getCashBankAccountLabel(account) {
  if (!account) {
    return "Akun otomatis belum tersedia";
  }

  return account.name || account.bankName || account.accountNumber || "-";
}

function formatPaymentAmountInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function parsePaymentAmountInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const numberValue = Number(digits || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
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

export default PayableListPage;