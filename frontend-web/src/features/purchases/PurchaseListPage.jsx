import {
  Eye,
  FileBarChart,
  Plus,
  RefreshCcw,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CurrencyInput from "../../components/form/CurrencyInput";
import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import FormActions from "../../components/form/FormActions";
import FormField from "../../components/form/FormField";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import Textarea from "../../components/ui/Textarea";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { supplierApi } from "../suppliers/supplier.api";
import { purchaseApi } from "./purchase.api";
import { usePagination } from "../../hooks/usePagination";

const DEFAULT_PAGE_SIZE = 15;

const initialPaymentForm = {
  amount: "",
  paymentMethod: "CASH",
  cashBankAccountId: "",
  note: "",
};

function PurchaseListPage() {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    supplierId: "",
    paymentStatus: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
  });

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingCashBankAccounts, setIsLoadingCashBankAccounts] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await purchaseApi.getList();
      const responseData = response.data?.data || response.data;

      const list =
        responseData?.purchases ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setPurchases(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);

    try {
      const response = await supplierApi.getList({
        status: "ACTIVE",
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.suppliers ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setSuppliers(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  const fetchCashBankAccounts = useCallback(async () => {
    setIsLoadingCashBankAccounts(true);

    try {
      const response = await cashBankApi.getList();
      const responseData = response.data?.data || response.data;

      const list =
        responseData?.cashBankAccounts ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setCashBankAccounts(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setCashBankAccounts([]);
    } finally {
      setIsLoadingCashBankAccounts(false);
    }
  }, []);

    useEffect(() => {
    const timeoutId = window.setTimeout(() => {
        fetchPurchases();
    }, 0);

    return () => {
        window.clearTimeout(timeoutId);
    };
    }, [fetchPurchases]);

        useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchSuppliers();
            fetchCashBankAccounts();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
        }, [fetchSuppliers, fetchCashBankAccounts]);

  const filteredPurchases = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const purchaseNumber = purchase.purchaseNumber || "";
      const supplierInvoiceNumber = purchase.supplierInvoiceNumber || "";
      const supplierName = purchase.supplier?.name || "";

      const matchesSearch = keyword
        ? purchaseNumber.toLowerCase().includes(keyword) ||
          supplierInvoiceNumber.toLowerCase().includes(keyword) ||
          supplierName.toLowerCase().includes(keyword)
        : true;

      const matchesSupplier = filters.supplierId
        ? purchase.supplierId === filters.supplierId
        : true;

      const normalizedPaymentStatus = getNormalizedPaymentStatus(purchase);
      
      const matchesPaymentStatus = filters.paymentStatus
    ? normalizedPaymentStatus === filters.paymentStatus
    : true;

      const matchesPaymentMethod = filters.paymentMethod
        ? purchase.paymentMethod === filters.paymentMethod
        : true;

      const matchesDate = isDateInRange(
        purchase.createdAt,
        filters.dateFrom,
        filters.dateTo
      );

      return (
        matchesSearch &&
        matchesSupplier &&
        matchesPaymentStatus &&
        matchesPaymentMethod &&
        matchesDate
      );
    });
  }, [
    purchases,
    debouncedSearch,
    filters.supplierId,
    filters.paymentStatus,
    filters.paymentMethod,
    filters.dateFrom,
    filters.dateTo,
  ]);

    const {
      currentPage,
      totalPages,
      paginatedData: paginatedPurchases,
      startItem,
      endItem,
      totalItems,
      setCurrentPage,
    } = usePagination(filteredPurchases, {
      pageSize: DEFAULT_PAGE_SIZE,
      resetKey: JSON.stringify({
        search: debouncedSearch,
        supplierId: filters.supplierId,
        paymentStatus: filters.paymentStatus,
        paymentMethod: filters.paymentMethod,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    });

  const handleSearchChange = (value) => {
    setCurrentPage(1);
    setSearchInput(value);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const handleDateRangeChange = (value) => {
    setCurrentPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
  };

  const handleResetFilter = () => {
    setCurrentPage(1);
    setSearchInput("");
    setFilters({
      supplierId: "",
      paymentStatus: "",
      paymentMethod: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const handleOpenPaymentModal = (purchase) => {
    setSelectedPurchase(purchase);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setSelectedPurchase(null);
    setIsPaymentModalOpen(false);
  };

  const handlePaymentSuccess = () => {
    setSelectedPurchase(null);
    setIsPaymentModalOpen(false);
    fetchPurchases();
  };

  const columns = useMemo(
    () => [
      {
        key: "purchaseNumber",
        label: "No Pembelian",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell" title={row.purchaseNumber || ""}>
            {row.purchaseNumber || "-"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Tanggal",
        width: "160px",
        align: "center",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "supplier",
        label: "Supplier",
        width: "220px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center purchase-supplier-cell">
            <strong>{row.supplier?.name || "-"}</strong>
            <span>{row.supplier?.phone || "-"}</span>
          </div>
        ),
      },
      {
        key: "supplierInvoiceNumber",
        label: "Invoice Supplier",
        width: "180px",
        align: "center",
        render: (row) => row.supplierInvoiceNumber || "-",
      },
      {
        key: "totalAmount",
        label: "Total",
        width: "150px",
        align: "center",
        render: (row) => formatCurrency(row.totalAmount),
      },
      {
        key: "paidAmount",
        label: "Dibayar",
        width: "150px",
        align: "center",
        render: (row) => formatCurrency(row.paidAmount),
      },
      {
        key: "remainingAmount",
        label: "Sisa",
        width: "150px",
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
          const status = getPurchasePaymentStatusMeta(row);


          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "paymentMethod",
        label: "Metode",
        width: "120px",
        align: "center",
        render: (row) => getPaymentMethodLabel(row.paymentMethod),
      },
      {
        key: "createdBy",
        label: "Dibuat Oleh",
        width: "160px",
        align: "center",
        render: (row) => row.createdBy?.name || row.createdBy?.username || "-",
      },
      {
        key: "actions",
        label: "Aksi",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-actions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/purchases/${row.id}`)}
            >
              <Eye size={15} />
              Detail
            </Button>

            {Number(row.remainingAmount || 0) > 0 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleOpenPaymentModal(row)}
              >
                <WalletCards size={15} />
                Bayar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Pembelian"
        description="Kelola transaksi pembelian barang dari supplier dan pantau status pembayarannya."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/purchases/report")}>
              <FileBarChart size={17} />
              Laporan
            </Button>

            <Button onClick={() => navigate("/purchases/create")}>
              <Plus size={17} />
              Tambah Pembelian
            </Button>
          </>
        }
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

            <Select
              name="supplierId"
              value={filters.supplierId}
              onChange={handleFilterChange}
              disabled={isLoadingSuppliers}
            >
              <option value="">
                {isLoadingSuppliers ? "Memuat supplier..." : "Semua Supplier"}
              </option>

              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>

            <Select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
            >
              <option value="">Semua Status Bayar</option>
              <option value="PAID">Lunas</option>
              <option value="PARTIAL">Sebagian</option>
              <option value="UNPAID">Belum Lunas</option>
            </Select>

            <Select
              name="paymentMethod"
              value={filters.paymentMethod}
              onChange={handleFilterChange}
            >
              <option value="">Semua Metode</option>
              <option value="CASH">Tunai</option>
              <option value="TRANSFER">Transfer</option>
            </Select>

            <Button variant="secondary" size="sm" onClick={fetchPurchases}>
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

        <Table
          className="purchase-table"
          columns={columns}
          data={paginatedPurchases}
          isLoading={isLoading}
          emptyTitle="Pembelian belum tersedia"
          emptyDescription="Belum ada transaksi pembelian yang cocok dengan filter saat ini."
        />

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </ListPageLayout>

      {isPaymentModalOpen ? (
        <PurchasePaymentModal
            open={isPaymentModalOpen}
            purchase={selectedPurchase}
            cashBankAccounts={cashBankAccounts}
            isLoadingCashBankAccounts={isLoadingCashBankAccounts}
            onClose={handleClosePaymentModal}
            onSuccess={handlePaymentSuccess}
        />
       ) : null}
    </>
  );
}

function PurchasePaymentModal({
  open,
  purchase,
  cashBankAccounts = [],
  isLoadingCashBankAccounts = false,
  onClose,
  onSuccess,
}) {
  const [formValues, setFormValues] = useState(initialPaymentForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingAmount = Number(purchase?.remainingAmount || 0);

  const activeCashBankAccounts = cashBankAccounts.filter(
    (account) => !account.status || account.status === "ACTIVE"
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleClose = () => {
    if (isSubmitting) return;

    if (onClose) {
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!purchase?.id) {
      setFormError("Data pembelian tidak ditemukan.");
      return;
    }

    const amount = Number(formValues.amount || 0);

    if (amount <= 0) {
      setFormError("Nominal pembayaran wajib lebih dari 0.");
      return;
    }

    if (amount > remainingAmount) {
      setFormError("Nominal pembayaran tidak boleh melebihi sisa hutang.");
      return;
    }

    if (!formValues.cashBankAccountId) {
      setFormError("Akun kas/bank wajib dipilih.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await purchaseApi.pay(purchase.id, {
        amount,
        paymentMethod: formValues.paymentMethod,
        cashBankAccountId: formValues.cashBankAccountId,
        note: formValues.note.trim() || undefined,
      });

      const responseData = response.data?.data || response.data;
      const updatedPurchase = responseData?.purchase || responseData;

      if (onSuccess) {
        onSuccess(updatedPurchase);
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      className="purchase-payment-modal"
      title="Bayar Hutang Pembelian"
      description={purchase?.purchaseNumber || "Catat pembayaran hutang supplier."}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        {formError ? <div className="form-error-alert">{formError}</div> : null}

        <div className="purchase-payment-summary">
          <div>
            <span>Total Pembelian</span>
            <strong>{formatCurrency(purchase?.totalAmount)}</strong>
          </div>

          <div>
            <span>Sudah Dibayar</span>
            <strong>{formatCurrency(purchase?.paidAmount)}</strong>
          </div>

          <div>
            <span>Sisa Hutang</span>
            <strong>{formatCurrency(purchase?.remainingAmount)}</strong>
          </div>
        </div>

        <div className="form-grid">
          <FormField label="Nominal Bayar" required>
            <CurrencyInput
              name="amount"
              value={formValues.amount}
              onChange={handleChange}
              placeholder="0"
              autoFocus
            />
          </FormField>

          <FormField label="Metode Pembayaran" required>
            <Select
              name="paymentMethod"
              value={formValues.paymentMethod}
              onChange={handleChange}
            >
              <option value="CASH">Tunai</option>
              <option value="TRANSFER">Transfer</option>
            </Select>
          </FormField>

          <FormField label="Akun Kas/Bank" required className="form-grid-full">
            <Select
              name="cashBankAccountId"
              value={formValues.cashBankAccountId}
              onChange={handleChange}
              disabled={isLoadingCashBankAccounts}
            >
              <option value="">
                {isLoadingCashBankAccounts
                  ? "Memuat akun kas/bank..."
                  : "Pilih akun kas/bank"}
              </option>

              {activeCashBankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.type ? ` - ${account.type}` : ""}
                  {account.bankName ? ` - ${account.bankName}` : ""}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Catatan" helper="Opsional." className="form-grid-full">
            <Textarea
              name="note"
              value={formValues.note}
              onChange={handleChange}
              placeholder="Contoh: Pembayaran termin kedua"
            />
          </FormField>
        </div>

        <FormActions
          submitLabel="Simpan Pembayaran"
          isSubmitting={isSubmitting}
          onCancel={handleClose}
        />
      </form>
    </Modal>
  );
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

function getPaymentMethodLabel(method) {
  if (method === "CASH") return "Tunai";
  if (method === "TRANSFER") return "Transfer";

  return method || "-";
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

function getNormalizedPaymentStatus(purchase) {
  const remainingAmount = Number(purchase?.remainingAmount || 0);
  const paidAmount = Number(purchase?.paidAmount || 0);

  if (remainingAmount <= 0) {
    return "PAID";
  }

  if (paidAmount > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

export default PurchaseListPage;