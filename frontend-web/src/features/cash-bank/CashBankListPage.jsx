import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  Edit,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  SearchCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { accountApi } from "../accounting/account.api";
import { cashBankApi } from "./cashBank.api";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";

const initialForm = {
  id: "",
  accountId: "",
  name: "",
  type: "CASH",
  bankName: "",
  accountNumber: "",
  currentBalance: "",
  status: "ACTIVE",
};

function CashBankListPage() {
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    status: "",
  });

  const [form, setForm] = useState(initialForm);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");

  const [selectedCashBankAccount, setSelectedCashBankAccount] = useState(null);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successDescription, setSuccessDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const activeAssetDebitAccounts = useMemo(() => {
    return accounts.filter(
      (account) =>
        account.status === "ACTIVE" &&
        account.type === "ASSET" &&
        account.normalBalance === "DEBIT"
    );
  }, [accounts]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [cashBankResponse, accountResponse] = await Promise.all([
        cashBankApi.getList(),
        accountApi.getList(),
      ]);

      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;
      const accountData = accountResponse.data?.data || accountResponse.data;

      setCashBankAccounts(
        Array.isArray(cashBankData?.cashBankAccounts)
          ? cashBankData.cashBankAccounts
          : Array.isArray(cashBankData)
            ? cashBankData
            : []
      );

      setAccounts(
        Array.isArray(accountData?.accounts)
          ? accountData.accounts
          : Array.isArray(accountData)
            ? accountData
            : []
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setCashBankAccounts([]);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  const filteredCashBankAccounts = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return cashBankAccounts.filter((cashBankAccount) => {
      const searchableText = [
        cashBankAccount.name,
        cashBankAccount.bankName,
        cashBankAccount.accountNumber,
        cashBankAccount.account?.code,
        cashBankAccount.account?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      const matchesType = filters.type
        ? cashBankAccount.type === filters.type
        : true;

      const matchesStatus = filters.status
        ? cashBankAccount.status === filters.status
        : true;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [cashBankAccounts, debouncedSearch, filters.type, filters.status]);

  const cashBankPagination = usePagination(filteredCashBankAccounts, {
    pageSize: 15,
    resetKey: `${debouncedSearch}|${filters.type}|${filters.status}`,
  });

  const summary = useMemo(() => {
    return filteredCashBankAccounts.reduce(
      (current, item) => {
        const balance = Number(item.currentBalance || 0);
        const isActive = item.status === "ACTIVE";
        const isCash = item.type === "CASH";
        const isBank = item.type === "BANK";

        return {
          totalAccount: current.totalAccount + 1,
          activeAccount: current.activeAccount + (isActive ? 1 : 0),
          cashBalance: current.cashBalance + (isCash ? balance : 0),
          bankBalance: current.bankBalance + (isBank ? balance : 0),
          totalBalance: current.totalBalance + balance,
        };
      },
      {
        totalAccount: 0,
        activeAccount: 0,
        cashBalance: 0,
        bankBalance: 0,
        totalBalance: 0,
      }
    );
  }, [filteredCashBankAccounts]);

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
      type: "",
      status: "",
    });
  };

  const handleOpenCreateModal = () => {
    setForm({
      ...initialForm,
      accountId: activeAssetDebitAccounts[0]?.id || "",
    });
    setFormMode("create");
    setErrorMessage("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((row) => {
    setForm({
      id: row.id,
      accountId: row.accountId || row.account?.id || "",
      name: row.name || "",
      type: row.type || "CASH",
      bankName: row.bankName || "",
      accountNumber: row.accountNumber || "",
      currentBalance: formatAmountInput(row.currentBalance),
      status: row.status || "ACTIVE",
    });
    setFormMode("edit");
    setErrorMessage("");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormModalOpen(false);
    setForm(initialForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "currentBalance") {
        return {
          ...current,
          currentBalance: formatAmountInput(value),
        };
      }

      if (name === "type") {
        return {
          ...current,
          type: value,
          bankName: value === "CASH" ? "" : current.bankName,
          accountNumber: value === "CASH" ? "" : current.accountNumber,
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmitForm = async (event) => {
    event.preventDefault();

    if (!form.accountId) {
      setErrorMessage("Pilih akun accounting terlebih dahulu.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage("Nama kas/bank wajib diisi.");
      return;
    }

    if (form.type === "BANK" && !form.bankName.trim()) {
      setErrorMessage("Nama bank wajib diisi untuk tipe Bank.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        accountId: form.accountId,
        name: form.name.trim(),
        type: form.type,
        bankName: form.type === "BANK" ? form.bankName.trim() : undefined,
        accountNumber:
          form.type === "BANK" && form.accountNumber.trim()
            ? form.accountNumber.trim()
            : undefined,
        currentBalance: parseAmountInput(form.currentBalance),
      };

      if (formMode === "create") {
        await cashBankApi.create(payload);
        setSuccessTitle("Akun kas/bank berhasil dibuat");
        setSuccessDescription("Data kas/bank baru sudah tersimpan di sistem.");
      } else {
        await cashBankApi.update(form.id, {
          ...payload,
          status: form.status,
        });
        setSuccessTitle("Akun kas/bank berhasil diperbarui");
        setSuccessDescription("Perubahan data kas/bank sudah tersimpan.");
      }

      await fetchData();

      setIsFormModalOpen(false);
      setIsSuccessModalOpen(true);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeactivateConfirm = useCallback((row) => {
    setSelectedCashBankAccount(row);
    setErrorMessage("");
    setIsDeactivateConfirmOpen(true);
  }, []);

  const handleConfirmDeactivate = async () => {
    if (!selectedCashBankAccount) {
      setIsDeactivateConfirmOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await cashBankApi.deactivate(selectedCashBankAccount.id);
      await fetchData();

      setIsDeactivateConfirmOpen(false);
      setSelectedCashBankAccount(null);
      setSuccessTitle("Akun kas/bank berhasil dinonaktifkan");
      setSuccessDescription(
        "Akun kas/bank tidak aktif lagi untuk transaksi baru."
      );
      setIsSuccessModalOpen(true);
    } catch (error) {
      setIsDeactivateConfirmOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Nama Akun",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.name || "-"}</strong>
            <span>{row.account?.name || "-"}</span>
          </div>
        ),
      },
      {
        key: "type",
        label: "Tipe",
        width: "120px",
        align: "center",
        render: (row) => (
          <Badge tone={row.type === "BANK" ? "info" : "warning"}>
            {row.type === "BANK" ? "Bank" : "Kas"}
          </Badge>
        ),
      },
      {
        key: "bankName",
        label: "Bank",
        width: "170px",
        align: "center",
        render: (row) => row.bankName || "-",
      },
      {
        key: "accountNumber",
        label: "No Rekening",
        width: "180px",
        align: "center",
        render: (row) => row.accountNumber || "-",
      },
      {
        key: "account",
        label: "Akun Accounting",
        width: "230px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.account?.code || "-"}</strong>
            <span>{row.account?.name || "-"}</span>
          </div>
        ),
      },
      {
        key: "currentBalance",
        label: "Saldo Saat Ini",
        width: "170px",
        align: "center",
        render: (row) => (
          <strong>{formatCurrency(row.currentBalance || 0)}</strong>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (row) => {
          const status = getStatusMeta(row.status);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "createdAt",
        label: "Dibuat",
        width: "145px",
        align: "center",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "actions",
        label: "Aksi",
        width: "190px",
        align: "center",
        render: (row) => (
          <div className="cash-bank-table-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenEditModal(row)}
            >
              <Edit size={14} />
              Edit
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenDeactivateConfirm(row)}
              disabled={row.status === "INACTIVE"}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenDeactivateConfirm, handleOpenEditModal]
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Kas & Bank"
      description="Kelola akun kas/bank operasional, saldo berjalan, rekening bank, dan akun accounting terkait."
      actions={
        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={17} />
          Tambah Kas/Bank
        </Button>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari nama kas, bank, no rekening, atau akun..."
          />

          <select
            className="report-filter-select"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
          >
            <option value="">Semua Tipe</option>
            <option value="CASH">Kas</option>
            <option value="BANK">Bank</option>
          </select>

          <select
            className="report-filter-select"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
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
        <CashBankSummaryCard
          tone="count"
          icon={<SearchCheck size={20} />}
          label="Jumlah Akun"
          value={summary.totalAccount}
          helper="Akun sesuai filter"
        />

        <CashBankSummaryCard
          tone="cash"
          icon={<Wallet size={20} />}
          label="Saldo Kas"
          value={formatCurrency(summary.cashBalance)}
          helper="Total akun tipe kas"
        />

        <CashBankSummaryCard
          tone="bank"
          icon={<Building2 size={20} />}
          label="Saldo Bank"
          value={formatCurrency(summary.bankBalance)}
          helper="Total akun rekening bank"
        />

        <CashBankSummaryCard
          tone="total"
          icon={<Banknote size={20} />}
          label="Total Saldo"
          value={formatCurrency(summary.totalBalance)}
          helper="Akumulasi kas dan bank"
        />
      </div>

      <Table
        className="cash-bank-list-table"
        columns={columns}
        data={cashBankPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Akun kas/bank belum tersedia"
        emptyDescription="Belum ada akun kas atau bank yang cocok dengan filter saat ini."
      />
      <Pagination
        page={cashBankPagination.currentPage}
        totalPages={cashBankPagination.totalPages}
        totalItems={cashBankPagination.totalItems}
        startItem={cashBankPagination.startItem}
        endItem={cashBankPagination.endItem}
        pageSize={cashBankPagination.pageSize}
        onPageChange={cashBankPagination.setCurrentPage}
      />

      {isFormModalOpen
        ? createPortal(
            <div className="cash-bank-modal-backdrop">
              <form className="cash-bank-form-modal" onSubmit={handleSubmitForm}>
                <div className="cash-bank-modal-header">
                  <div>
                    <span>
                      {formMode === "create"
                        ? "Tambah Kas/Bank"
                        : "Edit Kas/Bank"}
                    </span>
                    <strong>
                      {formMode === "create" ? "Akun Baru" : form.name || "-"}
                    </strong>
                    <p>
                      Pilih akun accounting asset-debit dan lengkapi data kas/bank.
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseFormModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="cash-bank-form-grid">
                  <label className="is-full">
                    Akun Accounting
                    <select
                      name="accountId"
                      value={form.accountId}
                      onChange={handleFormChange}
                    >
                      <option value="">Pilih akun accounting</option>
                      {activeAssetDebitAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nama Kas/Bank
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      placeholder="Contoh: Kas Toko"
                    />
                  </label>

                  <label>
                    Tipe
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleFormChange}
                    >
                      <option value="CASH">Kas</option>
                      <option value="BANK">Bank</option>
                    </select>
                  </label>

                  {form.type === "BANK" ? (
                    <>
                      <label>
                        Nama Bank
                        <input
                          name="bankName"
                          value={form.bankName}
                          onChange={handleFormChange}
                          placeholder="Contoh: BCA"
                        />
                      </label>

                      <label>
                        No Rekening
                        <input
                          name="accountNumber"
                          value={form.accountNumber}
                          onChange={handleFormChange}
                          placeholder="Opsional"
                        />
                      </label>
                    </>
                  ) : null}

                  <label className={form.type === "BANK" ? "" : "is-full"}>
                    Saldo Saat Ini
                    <input
                      name="currentBalance"
                      value={form.currentBalance}
                      onChange={handleFormChange}
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </label>

                  {formMode === "edit" ? (
                    <label>
                      Status
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleFormChange}
                      >
                        <option value="ACTIVE">Aktif</option>
                        <option value="INACTIVE">Nonaktif</option>
                      </select>
                    </label>
                  ) : null}
                </div>

                <div className="cash-bank-modal-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseFormModal}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>

                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    <Save size={15} />
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {isDeactivateConfirmOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmitting ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses akun...</h2>

                    <p>
                      Sistem sedang menonaktifkan akun kas/bank. Mohon tunggu
                      sebentar.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Nonaktifkan akun kas/bank?</h2>

                    <p>
                      Akun ini tidak dapat dipakai untuk transaksi baru setelah
                      dinonaktifkan.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Nama Akun</span>
                        <strong>{selectedCashBankAccount?.name || "-"}</strong>
                      </div>

                      <div>
                        <span>Tipe</span>
                        <strong>
                          {selectedCashBankAccount?.type === "BANK"
                            ? "Bank"
                            : "Kas"}
                        </strong>
                      </div>

                      <div>
                        <span>Saldo</span>
                        <strong>
                          {formatCurrency(
                            selectedCashBankAccount?.currentBalance || 0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="return-confirm-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsDeactivateConfirmOpen(false)}
                        disabled={isSubmitting}
                      >
                        Tidak
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmDeactivate}
                        disabled={isSubmitting}
                      >
                        Ya, Nonaktifkan
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

                <h2>{successTitle}</h2>

                <p>{successDescription}</p>

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
    </ListPageLayout>
  );
}

function CashBankSummaryCard({
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

function getStatusMeta(status) {
  const statuses = {
    ACTIVE: {
      label: "Aktif",
      tone: "success",
    },
    INACTIVE: {
      label: "Nonaktif",
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

export default CashBankListPage;