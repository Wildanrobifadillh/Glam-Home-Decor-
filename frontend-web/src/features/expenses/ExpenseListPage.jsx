import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCcw,
  Save,
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
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { accountApi } from "../accounting/account.api";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { expenseApi } from "./expense.api";

const initialForm = {
  expenseDate: "",
  accountId: "",
  amount: "",
  paymentMethod: "CASH",
  description: "",
  note: "",
};

function ExpenseListPage() {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [searchInput, setSearchInput] = useState("");

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    accountId: "",
    cashBankAccountId: "",
    paymentMethod: "",
    status: "",
  });

  const [form, setForm] = useState(initialForm);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCreateConfirmModalOpen, setIsCreateConfirmModalOpen] =
    useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const expenseAccounts = useMemo(() => {
    return accounts.filter((account) => account.type === "EXPENSE");
  }, [accounts]);

  const activeExpenseAccounts = useMemo(() => {
    return expenseAccounts.filter((account) => account.status === "ACTIVE");
  }, [expenseAccounts]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter(
      (account) => account.status === "ACTIVE" && account.isActive !== false
    );
  }, [cashBankAccounts]);

  const effectiveCashBankAccount = useMemo(() => {
    const accountId = getDefaultCashBankAccountId(
      activeCashBankAccounts,
      form.paymentMethod
    );

    return activeCashBankAccounts.find((account) => account.id === accountId);
  }, [activeCashBankAccounts, form.paymentMethod]);

  const effectiveCashBankAccountId = effectiveCashBankAccount?.id || "";
  const effectiveCashBankAccountLabel =
    getCashBankAccountLabel(effectiveCashBankAccount);

  const expenseParams = useMemo(() => {
    const params = {};

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (filters.dateFrom) {
      params.startDate = filters.dateFrom;
    }

    if (filters.dateTo) {
      params.endDate = filters.dateTo;
    }

    if (filters.accountId) {
      params.accountId = filters.accountId;
    }

    if (filters.cashBankAccountId) {
      params.cashBankAccountId = filters.cashBankAccountId;
    }

    if (filters.paymentMethod) {
      params.paymentMethod = filters.paymentMethod;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    return params;
  }, [
    debouncedSearch,
    filters.accountId,
    filters.cashBankAccountId,
    filters.dateFrom,
    filters.dateTo,
    filters.paymentMethod,
    filters.status,
  ]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [expenseResponse, accountResponse, cashBankResponse] =
        await Promise.all([
          expenseApi.getList(expenseParams),
          accountApi.getList(),
          cashBankApi.getList(),
        ]);

      const expenseData = expenseResponse.data?.data || expenseResponse.data;
      const accountData = accountResponse.data?.data || accountResponse.data;
      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;

      setExpenses(
        Array.isArray(expenseData?.expenses)
          ? expenseData.expenses
          : Array.isArray(expenseData)
            ? expenseData
            : []
      );

      setAccounts(
        Array.isArray(accountData?.accounts)
          ? accountData.accounts
          : Array.isArray(accountData)
            ? accountData
            : []
      );

      setCashBankAccounts(
        Array.isArray(cashBankData?.cashBankAccounts)
          ? cashBankData.cashBankAccounts
          : Array.isArray(cashBankData)
            ? cashBankData
            : []
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setExpenses([]);
      setAccounts([]);
      setCashBankAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [expenseParams]);

  const fetchExpenseDetail = useCallback(async (id) => {
    const response = await expenseApi.getById(id);
    const responseData = response.data?.data || response.data;
    const expense = responseData?.expense || responseData;

    setSelectedExpense(expense || null);

    return expense || null;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  const summary = useMemo(() => {
    return expenses.reduce(
      (current, expense) => {
        const amount = Number(expense.amount || 0);

        return {
          expenseCount: current.expenseCount + 1,
          totalAmount: current.totalAmount + amount,
          cashAmount:
            current.cashAmount +
            (expense.paymentMethod === "CASH" ? amount : 0),
          transferAmount:
            current.transferAmount +
            (expense.paymentMethod === "TRANSFER" ? amount : 0),
        };
      },
      {
        expenseCount: 0,
        totalAmount: 0,
        cashAmount: 0,
        transferAmount: 0,
      }
    );
  }, [expenses]);

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
      accountId: "",
      cashBankAccountId: "",
      paymentMethod: "",
      status: "",
    });
  };

  const handleOpenCreateModal = () => {
    setForm({
      ...initialForm,
      expenseDate: getTodayInputDate(),
      accountId: activeExpenseAccounts[0]?.id || "",
      paymentMethod: "CASH",
    });

    setErrorMessage("");
    setIsFormModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormModalOpen(false);
    setForm(initialForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "amount") {
        return {
          ...current,
          amount: formatAmountInput(value),
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmitForm = (event) => {
    event.preventDefault();

    const amount = parseAmountInput(form.amount);

    if (!form.expenseDate) {
      setErrorMessage("Tanggal expense wajib diisi.");
      return;
    }

    if (!form.accountId) {
      setErrorMessage("Akun expense wajib dipilih.");
      return;
    }

    if (amount <= 0) {
      setErrorMessage("Nominal expense harus lebih dari 0.");
      return;
    }

    if (!effectiveCashBankAccountId) {
      setErrorMessage("Akun kas/bank otomatis belum tersedia.");
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage("Deskripsi expense wajib diisi.");
      return;
    }

    setErrorMessage("");
    setIsCreateConfirmModalOpen(true);
  };

  const handleConfirmCreate = async () => {
    const amount = parseAmountInput(form.amount);

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await expenseApi.create({
        expenseDate: form.expenseDate,
        accountId: form.accountId,
        cashBankAccountId: effectiveCashBankAccountId,
        amount,
        paymentMethod: form.paymentMethod,
        description: form.description.trim(),
        note: form.note.trim() || undefined,
      });

      await fetchData();

      setIsCreateConfirmModalOpen(false);
      setIsFormModalOpen(false);
      setForm(initialForm);
      setIsSuccessModalOpen(true);
    } catch (error) {
      setIsCreateConfirmModalOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = useCallback(
    async (row, event) => {
      event?.preventDefault();
      event?.stopPropagation();

      setIsDetailModalOpen(true);
      setIsDetailLoading(true);
      setSelectedExpense(null);
      setErrorMessage("");

      try {
        await fetchExpenseDetail(row.id);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [fetchExpenseDetail]
  );

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedExpense(null);
  };

  const expensePagination = usePagination(expenses, {
    pageSize: 15,
    resetKey: `${debouncedSearch}|${filters.dateFrom}|${filters.dateTo}|${filters.accountId}|${filters.cashBankAccountId}|${filters.paymentMethod}|${filters.status}`,
  });

  const columns = useMemo(
    () => [
      {
        key: "expenseDate",
        label: "Tanggal",
        width: "145px",
        align: "center",
        render: (row) => formatDate(row.expenseDate),
      },
      {
        key: "expenseNumber",
        label: "No Expense",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">
            {row.expenseNumber || "-"}
          </span>
        ),
      },
      {
        key: "account",
        label: "Akun Expense",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.account?.name || "-"}</strong>
            <span>{row.account?.code || "-"}</span>
          </div>
        ),
      },
      {
        key: "cashBankAccount",
        label: "Kas/Bank",
        width: "230px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.cashBankAccount?.name || "-"}</strong>
            <span>
              {row.cashBankAccount?.type === "BANK" ? "Bank" : "Kas"}
            </span>
          </div>
        ),
      },
      {
        key: "paymentMethod",
        label: "Metode",
        width: "130px",
        align: "center",
        render: (row) => (
          <Badge tone={row.paymentMethod === "TRANSFER" ? "info" : "warning"}>
            {getPaymentMethodLabel(row.paymentMethod)}
          </Badge>
        ),
      },
      {
        key: "amount",
        label: "Nominal",
        width: "170px",
        align: "center",
        render: (row) => <strong>{formatCurrency(row.amount)}</strong>,
      },
      {
        key: "description",
        label: "Deskripsi",
        width: "260px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.description || "-"}</strong>
            <span>{row.note || "-"}</span>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (row) => {
          const status = getExpenseStatusMeta(row.status);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
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
      title="Expense"
      description="Catat dan pantau biaya operasional toko, metode pembayaran, akun expense, serta kas/bank yang digunakan."
      actions={
        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={17} />
          Tambah Expense
        </Button>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari no expense, deskripsi, catatan, atau akun..."
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
            name="paymentMethod"
            value={filters.paymentMethod}
            onChange={handleFilterChange}
          >
            <option value="">Semua Metode</option>
            <option value="CASH">Tunai</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <select
            className="report-filter-select"
            name="accountId"
            value={filters.accountId}
            onChange={handleFilterChange}
          >
            <option value="">Semua Akun Expense</option>
            {expenseAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>

          <select
            className="report-filter-select"
            name="cashBankAccountId"
            value={filters.cashBankAccountId}
            onChange={handleFilterChange}
          >
            <option value="">Semua Kas/Bank</option>
            {cashBankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <Button variant="secondary" size="sm" onClick={fetchData}>
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

      <div className="cash-bank-summary-grid">
        <ExpenseSummaryCard
          tone="count"
          icon={<ReceiptText size={20} />}
          label="Jumlah Expense"
          value={summary.expenseCount}
          helper="Expense sesuai filter"
        />

        <ExpenseSummaryCard
          tone="cash"
          icon={<WalletCards size={20} />}
          label="Tunai"
          value={formatCurrency(summary.cashAmount)}
          helper="Dibayar melalui kas"
        />

        <ExpenseSummaryCard
          tone="bank"
          icon={<Banknote size={20} />}
          label="Transfer"
          value={formatCurrency(summary.transferAmount)}
          helper="Dibayar melalui bank"
        />

        <ExpenseSummaryCard
          tone="total"
          icon={<CalendarClock size={20} />}
          label="Total Expense"
          value={formatCurrency(summary.totalAmount)}
          helper="Akumulasi biaya"
        />
      </div>

      <Table
        className="cash-bank-list-table"
        columns={columns}
        data={expensePagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Expense belum tersedia"
        emptyDescription="Belum ada data expense yang cocok dengan filter saat ini."
      />
      <Pagination
        page={expensePagination.currentPage}
        totalPages={expensePagination.totalPages}
        totalItems={expensePagination.totalItems}
        startItem={expensePagination.startItem}
        endItem={expensePagination.endItem}
        pageSize={expensePagination.pageSize}
        onPageChange={expensePagination.setCurrentPage}
      />

      {isFormModalOpen
        ? createPortal(
            <div className="cash-bank-modal-backdrop">
              <form className="cash-bank-form-modal" onSubmit={handleSubmitForm}>
                <div className="cash-bank-modal-header">
                  <div>
                    <span>Tambah Expense</span>
                    <strong>Expense Operasional</strong>
                    <p>
                      Pilih akun expense, metode pembayaran, dan nominal biaya
                      yang dikeluarkan.
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseCreateModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="cash-bank-form-grid">
                  <label>
                    Tanggal
                    <input
                      type="date"
                      name="expenseDate"
                      value={form.expenseDate}
                      onChange={handleFormChange}
                    />
                  </label>

                  <label>
                    Metode Bayar
                    <select
                      name="paymentMethod"
                      value={form.paymentMethod}
                      onChange={handleFormChange}
                    >
                      <option value="CASH">Tunai</option>
                      <option value="TRANSFER">Transfer</option>
                    </select>
                  </label>

                  <label className="is-full">
                    Akun Expense
                    <select
                      name="accountId"
                      value={form.accountId}
                      onChange={handleFormChange}
                    >
                      <option value="">Pilih akun expense</option>
                      {activeExpenseAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nominal
                    <input
                      name="amount"
                      value={form.amount}
                      onChange={handleFormChange}
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </label>

                  <label>
                    Akun Kas/Bank
                    <input value={effectiveCashBankAccountLabel} readOnly />
                  </label>

                  <label className="is-full">
                    Deskripsi
                    <input
                      name="description"
                      value={form.description}
                      onChange={handleFormChange}
                      placeholder="Contoh: Bayar listrik toko"
                    />
                  </label>

                  <label className="is-full">
                    Catatan
                    <textarea
                      name="note"
                      value={form.note}
                      onChange={handleFormChange}
                      placeholder="Catatan tambahan..."
                      rows={4}
                    />
                  </label>
                </div>

                <div className="cash-bank-modal-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseCreateModal}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>

                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    <Save size={15} />
                    Simpan Expense
                  </Button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {isCreateConfirmModalOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmitting ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses expense...</h2>

                    <p>
                      Sistem sedang mencatat expense, membuat jurnal, dan
                      menghubungkan transaksi ke kas/bank.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Yakin ingin mencatat expense?</h2>

                    <p>
                      Expense ini akan masuk sebagai biaya operasional dan
                      dicatat ke jurnal accounting.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Nominal</span>
                        <strong>
                          {formatCurrency(parseAmountInput(form.amount))}
                        </strong>
                      </div>

                      <div>
                        <span>Metode</span>
                        <strong>{getPaymentMethodLabel(form.paymentMethod)}</strong>
                      </div>

                      <div>
                        <span>Kas/Bank</span>
                        <strong>{effectiveCashBankAccountLabel}</strong>
                      </div>
                    </div>

                    <div className="return-confirm-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsCreateConfirmModalOpen(false)}
                        disabled={isSubmitting}
                      >
                        Tidak
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmCreate}
                        disabled={isSubmitting}
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

      {isSuccessModalOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal return-success-modal">
                <div className="return-confirm-icon is-success">
                  <CheckCircle2 size={42} />
                </div>

                <h2>Expense berhasil dicatat</h2>

                <p>
                  Data expense sudah tersimpan dan jurnal accounting berhasil
                  dibuat.
                </p>

                <div className="return-confirm-actions is-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsSuccessModalOpen(false)}
                  >
                    Selesai
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isDetailModalOpen
        ? createPortal(
            <div className="receivable-detail-backdrop">
              <div className="receivable-detail-modal">
                <div className="receivable-detail-header">
                  <div>
                    <span>Detail Expense</span>
                    <strong>{selectedExpense?.expenseNumber || "-"}</strong>
                    <p>
                      {selectedExpense?.expenseDate
                        ? `Tanggal ${formatDate(selectedExpense.expenseDate)}`
                        : "Memuat detail expense..."}
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseDetail}>
                    <X size={20} />
                  </button>
                </div>

                {isDetailLoading ? (
                  <div className="return-empty-state">
                    Memuat detail expense...
                  </div>
                ) : null}

                {!isDetailLoading && selectedExpense ? (
                  <>
                    <div className="receivable-detail-summary">
                      <div>
                        <span>Akun Expense</span>
                        <strong>{selectedExpense.account?.name || "-"}</strong>
                        <p>{selectedExpense.account?.code || "-"}</p>
                      </div>

                      <div>
                        <span>Nominal</span>
                        <strong>{formatCurrency(selectedExpense.amount)}</strong>
                      </div>

                      <div>
                        <span>Metode</span>
                        <strong>
                          {getPaymentMethodLabel(selectedExpense.paymentMethod)}
                        </strong>
                      </div>

                      <div>
                        <span>Kas/Bank</span>
                        <strong>
                          {selectedExpense.cashBankAccount?.name || "-"}
                        </strong>
                        <p>
                          {selectedExpense.cashBankAccount?.type === "BANK"
                            ? "Bank"
                            : "Kas"}
                        </p>
                      </div>

                      <div>
                        <span>Status</span>
                        <strong>{selectedExpense.status || "-"}</strong>
                      </div>
                    </div>

                    <div className="receivable-detail-section">
                      <div className="return-section-title">
                        <FileText size={18} />
                        <span>Deskripsi & Catatan</span>
                      </div>

                      <div className="return-empty-state">
                        <strong>{selectedExpense.description || "-"}</strong>
                        <br />
                        {selectedExpense.note || "Tidak ada catatan tambahan."}
                      </div>
                    </div>

                    <div className="receivable-detail-footer">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCloseDetail}
                      >
                        Tutup
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </ListPageLayout>
  );
}

function ExpenseSummaryCard({
  tone = "neutral",
  icon,
  label,
  value,
  helper,
}) {
  return (
    <Card className={`cash-bank-summary-card cash-bank-summary-card-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function getExpenseStatusMeta(status) {
  const statuses = {
    POSTED: {
      label: "Posted",
      tone: "success",
    },
    CANCELLED: {
      label: "Cancelled",
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

function formatAmountInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function parseAmountInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const numberValue = Number(digits || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getTodayInputDate() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 10);
}

export default ExpenseListPage;