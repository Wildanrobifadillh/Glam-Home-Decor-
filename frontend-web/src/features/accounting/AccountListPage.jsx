import {
  AlertTriangle,
  CheckCircle2,
  Power,
  Edit,
  Landmark,
  Layers3,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  SearchCheck,
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
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { accountApi } from "./account.api";

const initialForm = {
  id: "",
  code: "",
  name: "",
  type: "ASSET",
  normalBalance: "DEBIT",
  parentId: "",
  status: "ACTIVE",
};

function AccountListPage() {
  const [accounts, setAccounts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    status: "",
  });

  const [form, setForm] = useState(initialForm);
  const [formMode, setFormMode] = useState("create");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successDescription, setSuccessDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const parentAccountOptions = useMemo(() => {
    return accounts.filter(
      (account) => account.status === "ACTIVE" && account.id !== form.id
    );
  }, [accounts, form.id]);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await accountApi.getList();
      const responseData = response.data?.data || response.data;

      setAccounts(
        Array.isArray(responseData?.accounts)
          ? responseData.accounts
          : Array.isArray(responseData)
            ? responseData
            : []
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchAccounts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return accounts.filter((account) => {
      const searchableText = [
        account.code,
        account.name,
        account.type,
        account.normalBalance,
        account.parent?.code,
        account.parent?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;
      const matchesType = filters.type ? account.type === filters.type : true;
      const matchesStatus = filters.status
        ? account.status === filters.status
        : true;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, debouncedSearch, filters.type, filters.status]);

    const accountPagination = usePagination(filteredAccounts, {
      pageSize: 15,
      resetKey: `${debouncedSearch}|${filters.type}|${filters.status}`,
    });

  const summary = useMemo(() => {
    return filteredAccounts.reduce(
      (current, account) => {
        const isActive = account.status === "ACTIVE";

        return {
          totalAccount: current.totalAccount + 1,
          activeAccount: current.activeAccount + (isActive ? 1 : 0),
          assetAccount: current.assetAccount + (account.type === "ASSET" ? 1 : 0),
          expenseAccount:
            current.expenseAccount + (account.type === "EXPENSE" ? 1 : 0),
        };
      },
      {
        totalAccount: 0,
        activeAccount: 0,
        assetAccount: 0,
        expenseAccount: 0,
      }
    );
  }, [filteredAccounts]);

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
    setForm(initialForm);
    setFormMode("create");
    setErrorMessage("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((row) => {
    setForm({
      id: row.id,
      code: row.code || "",
      name: row.name || "",
      type: row.type || "ASSET",
      normalBalance: row.normalBalance || getDefaultNormalBalance(row.type),
      parentId: row.parentId || row.parent?.id || "",
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
      if (name === "type") {
        return {
          ...current,
          type: value,
          normalBalance: getDefaultNormalBalance(value),
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

    if (!form.code.trim()) {
      setErrorMessage("Kode akun wajib diisi.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage("Nama akun wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        normalBalance: form.normalBalance,
        parentId: form.parentId || null,
      };

      if (formMode === "create") {
        await accountApi.create(payload);
        setSuccessTitle("Akun perkiraan berhasil dibuat");
        setSuccessDescription("Akun baru sudah tersimpan dan bisa digunakan.");
      } else {
        await accountApi.update(form.id, {
          ...payload,
          status: form.status,
        });
        setSuccessTitle("Akun perkiraan berhasil diperbarui");
        setSuccessDescription("Perubahan akun sudah tersimpan.");
      }

      await fetchAccounts();

      setIsFormModalOpen(false);
      setForm(initialForm);
      setIsSuccessModalOpen(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeactivateConfirm = useCallback((row) => {
    setSelectedAccount(row);
    setErrorMessage("");
    setIsDeactivateConfirmOpen(true);
  }, []);

  const handleConfirmDeactivate = async () => {
    if (!selectedAccount) {
        setIsDeactivateConfirmOpen(false);
        return;
    }

    const isCurrentlyActive = selectedAccount.status === "ACTIVE";

    setIsSubmitting(true);
    setErrorMessage("");

    try {
        if (isCurrentlyActive) {
        await accountApi.deactivate(selectedAccount.id);

        setSuccessTitle("Akun perkiraan berhasil dinonaktifkan");
        setSuccessDescription("Akun tidak aktif lagi untuk transaksi baru.");
        } else {
        await accountApi.update(selectedAccount.id, {
            status: "ACTIVE",
        });

        setSuccessTitle("Akun perkiraan berhasil diaktifkan");
        setSuccessDescription("Akun sudah aktif dan bisa digunakan kembali.");
        }

        await fetchAccounts();

        setIsDeactivateConfirmOpen(false);
        setSelectedAccount(null);
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
        key: "code",
        label: "Kode",
        width: "130px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">{row.code || "-"}</span>
        ),
      },
      {
        key: "name",
        label: "Nama Akun",
        width: "260px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.name || "-"}</strong>
            <span>{row.parent ? `Parent: ${row.parent.code}` : "Akun utama"}</span>
          </div>
        ),
      },
      {
        key: "type",
        label: "Tipe",
        width: "150px",
        align: "center",
        render: (row) => {
          const type = getAccountTypeMeta(row.type);

          return <Badge tone={type.tone}>{type.label}</Badge>;
        },
      },
      {
        key: "normalBalance",
        label: "Normal",
        width: "130px",
        align: "center",
        render: (row) => (
          <Badge tone={row.normalBalance === "DEBIT" ? "success" : "warning"}>
            {row.normalBalance === "DEBIT" ? "Debit" : "Credit"}
          </Badge>
        ),
      },
      {
        key: "parent",
        label: "Parent",
        width: "220px",
        align: "center",
        render: (row) =>
          row.parent ? (
            <div className="table-main-text is-center">
              <strong>{row.parent.code}</strong>
              <span>{row.parent.name}</span>
            </div>
          ) : (
            "-"
          ),
      },
      {
        key: "children",
        label: "Sub Akun",
        width: "120px",
        align: "center",
        render: (row) => row.children?.length || 0,
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
                className={
                    row.status === "ACTIVE"
                    ? "account-deactivate-icon-button is-active"
                    : "account-deactivate-icon-button is-inactive"
                }
                onClick={() => handleOpenDeactivateConfirm(row)}
                title={
                    row.status === "ACTIVE"
                    ? "Nonaktifkan akun"
                    : "Aktifkan akun"
                }
                >
                <Power size={15} />
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
      title="Akun Perkiraan"
      description="Kelola chart of accounts untuk kas/bank, hutang, modal, pendapatan, HPP, dan biaya operasional."
      actions={
        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={17} />
          Tambah Akun
        </Button>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari kode akun, nama akun, tipe, atau parent..."
          />

          <select
            className="report-filter-select"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
          >
            <option value="">Semua Tipe</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="COGS">COGS</option>
            <option value="EXPENSE">Expense</option>
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

          <Button variant="secondary" size="sm" onClick={fetchAccounts}>
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
        <AccountSummaryCard
          tone="count"
          icon={<SearchCheck size={20} />}
          label="Jumlah Akun"
          value={summary.totalAccount}
          helper="Akun sesuai filter"
        />

        <AccountSummaryCard
          tone="cash"
          icon={<CheckCircle2 size={20} />}
          label="Akun Aktif"
          value={summary.activeAccount}
          helper="Bisa dipakai transaksi"
        />

        <AccountSummaryCard
          tone="bank"
          icon={<Landmark size={20} />}
          label="Asset"
          value={summary.assetAccount}
          helper="Kas, bank, persediaan"
        />

        <AccountSummaryCard
          tone="total"
          icon={<Layers3 size={20} />}
          label="Expense"
          value={summary.expenseAccount}
          helper="Akun biaya operasional"
        />
      </div>

      <Table
        className="cash-bank-list-table"
        columns={columns}
        data={accountPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Akun perkiraan belum tersedia"
        emptyDescription="Belum ada akun yang cocok dengan filter saat ini."
      />

      <Pagination
        page={accountPagination.currentPage}
        totalPages={accountPagination.totalPages}
        totalItems={accountPagination.totalItems}
        startItem={accountPagination.startItem}
        endItem={accountPagination.endItem}
        pageSize={accountPagination.pageSize}
        onPageChange={accountPagination.setCurrentPage}
      />

      {isFormModalOpen
        ? createPortal(
            <div className="cash-bank-modal-backdrop">
              <form className="cash-bank-form-modal" onSubmit={handleSubmitForm}>
                <div className="cash-bank-modal-header">
                  <div>
                    <span>
                      {formMode === "create" ? "Tambah Akun" : "Edit Akun"}
                    </span>
                    <strong>
                      {formMode === "create" ? "Akun Baru" : form.code || "-"}
                    </strong>
                    <p>
                      Atur kode, nama, tipe, normal balance, dan parent akun.
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseFormModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="cash-bank-form-grid">
                  <label>
                    Kode Akun
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleFormChange}
                      placeholder="Contoh: 6101"
                    />
                  </label>

                  <label>
                    Nama Akun
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      placeholder="Contoh: Beban Listrik"
                    />
                  </label>

                  <label>
                    Tipe Akun
                    <select name="type" value={form.type} onChange={handleFormChange}>
                      <option value="ASSET">Asset</option>
                      <option value="LIABILITY">Liability</option>
                      <option value="EQUITY">Equity</option>
                      <option value="REVENUE">Revenue</option>
                      <option value="COGS">COGS</option>
                      <option value="EXPENSE">Expense</option>
                    </select>
                  </label>

                  <label>
                    Normal Balance
                    <select
                      name="normalBalance"
                      value={form.normalBalance}
                      onChange={handleFormChange}
                    >
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </label>

                  <label className="is-full">
                    Parent Akun
                    <select
                      name="parentId"
                      value={form.parentId}
                      onChange={handleFormChange}
                    >
                      <option value="">Tanpa parent / akun utama</option>
                      {parentAccountOptions.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {formMode === "edit" ? (
                    <label className="is-full">
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
                    {isSubmitting ? "Menyimpan..." : "Simpan Akun"}
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

                    <p>Sistem sedang menonaktifkan akun perkiraan.</p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>
                        {selectedAccount?.status === "ACTIVE"
                            ? "Nonaktifkan akun perkiraan?"
                            : "Aktifkan akun perkiraan?"}
                        </h2>

                        <p>
                        {selectedAccount?.status === "ACTIVE"
                            ? "Akun ini tidak dapat digunakan untuk transaksi baru setelah dinonaktifkan."
                            : "Akun ini akan aktif kembali dan bisa digunakan untuk transaksi baru."}
                        </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Kode</span>
                        <strong>{selectedAccount?.code || "-"}</strong>
                      </div>

                      <div>
                        <span>Nama</span>
                        <strong>{selectedAccount?.name || "-"}</strong>
                      </div>

                      <div>
                        <span>Tipe</span>
                        <strong>
                          {getAccountTypeMeta(selectedAccount?.type).label}
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
                        {selectedAccount?.status === "ACTIVE"
                        ? "Ya, Nonaktifkan"
                        : "Ya, Aktifkan"}
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

function AccountSummaryCard({
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

function getDefaultNormalBalance(type) {
  if (["ASSET", "COGS", "EXPENSE"].includes(type)) {
    return "DEBIT";
  }

  return "CREDIT";
}

function getAccountTypeMeta(type) {
  const types = {
    ASSET: {
      label: "Asset",
      tone: "success",
    },
    LIABILITY: {
      label: "Liability",
      tone: "warning",
    },
    EQUITY: {
      label: "Equity",
      tone: "info",
    },
    REVENUE: {
      label: "Revenue",
      tone: "success",
    },
    COGS: {
      label: "COGS",
      tone: "warning",
    },
    EXPENSE: {
      label: "Expense",
      tone: "danger",
    },
  };

  return (
    types[type] || {
      label: type || "-",
      tone: "neutral",
    }
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

export default AccountListPage;