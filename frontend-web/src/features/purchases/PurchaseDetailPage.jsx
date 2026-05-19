import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Package,
  RefreshCcw,
  Truck,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CurrencyInput from "../../components/form/CurrencyInput";
import FormActions from "../../components/form/FormActions";
import FormField from "../../components/form/FormField";
import ModuleHeader from "../../components/layout/ModuleHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import Textarea from "../../components/ui/Textarea";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDateTime } from "../../utils/formatDateTime";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { purchaseApi } from "./purchase.api";

const initialPaymentForm = {
  amount: "",
  paymentMethod: "CASH",
  cashBankAccountId: "",
  note: "",
};

function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState(null);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCashBankAccounts, setIsLoadingCashBankAccounts] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchPurchase = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await purchaseApi.getById(id);
      const responseData = response.data?.data || response.data;
      const detail = responseData?.purchase || responseData;

      setPurchase(detail || null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPurchase(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

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
      fetchPurchase();
      fetchCashBankAccounts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchPurchase, fetchCashBankAccounts]);

  const paymentTimeline = useMemo(() => {
    return buildPaymentTimeline(purchase);
  }, [purchase]);

  const itemColumns = useMemo(
    () => [
            {
            key: "product",
            label: "Barang",
            width: "320px",
            align: "center",
            render: (row) => (
          <div className="table-main-text">
            <strong>{row.product?.name || "-"}</strong>
            <span>
              {row.product?.supplierCode || "-"} • {row.product?.unit || "-"}
            </span>
          </div>
        ),
      },
      {
        key: "category",
        label: "Kategori",
        width: "180px",
        align: "center",
        render: (row) => row.product?.category?.name || "-",
      },
      {
        key: "quantity",
        label: "Qty",
        width: "100px",
        align: "center",
        render: (row) => row.quantity || 0,
      },
        {
        key: "purchasePrice",
        label: "Harga Beli",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.purchasePrice),
        },
      {
        key: "subtotal",
        label: "Subtotal",
        width: "170px",
        align: "center",
        render: (row) => formatCurrency(row.subtotal),
      },
    ],
    []
  );

  const paymentColumns = useMemo(
    () => [
            {
            key: "type",
            label: "Jenis",
            width: "190px",
            align: "center",
            render: (row) => (
          <div className="purchase-payment-type">
            <strong>{row.title}</strong>
            <span>{row.description}</span>
          </div>
        ),
      },
      {
        key: "createdAt",
        label: "Tanggal Pembayaran",
        width: "190px",
        align: "center",
        render: (row) => formatDateTime(row.createdAt),
      },
        {
        key: "amount",
        label: "Nominal",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.amount),
        },
      {
        key: "paymentMethod",
        label: "Metode",
        width: "130px",
        align: "center",
        render: (row) => getPaymentMethodLabel(row.paymentMethod),
      },
        {
        key: "cashBankAccount",
        label: "Akun Kas/Bank",
        width: "210px",
        align: "center",
        render: (row) => (
          <div className="table-main-text">
            <strong>{row.cashBankAccount?.name || "-"}</strong>
            <span>
              {row.cashBankAccount?.type || "-"}
              {row.cashBankAccount?.bankName
                ? ` • ${row.cashBankAccount.bankName}`
                : ""}
            </span>
          </div>
        ),
      },
      {
        key: "createdBy",
        label: "Dicatat Oleh",
        width: "170px",
        align: "center",
        render: (row) => row.createdBy?.name || row.createdBy?.username || "-",
      },
      {
        key: "note",
        label: "Catatan",
        width: "240px",
        align: "center",
        render: (row) => row.note || "-",
      },
    ],
    []
  );

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    fetchPurchase();
  };

  const status = getPurchasePaymentStatusMeta(purchase);

  if (isLoading && !purchase) {
    return (
      <div className="purchase-detail-page">
        <Loading text="Memuat detail pembelian..." />
      </div>
    );
  }

  if (!isLoading && !purchase) {
    return (
      <div className="purchase-detail-page">
        <ModuleHeader
          eyebrow=""
          title="Detail Pembelian"
          description="Data pembelian tidak ditemukan atau gagal dimuat."
          actions={
            <Button variant="secondary" onClick={() => navigate("/purchases")}>
              <ArrowLeft size={17} />
              Kembali
            </Button>
          }
        />

        {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}

        <Card>
          <EmptyState
            title="Pembelian tidak ditemukan"
            description="Silakan kembali ke daftar pembelian dan pilih transaksi lain."
          />
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="purchase-detail-page">
        <ModuleHeader
          eyebrow=""
          title="Detail Pembelian"
          description="Lihat detail transaksi, item barang, status hutang, dan timeline pembayaran."
        />

        <div className="purchase-page-toolbar purchase-detail-toolbar">
          <Button
            type="button"
            className="purchase-back-button"
            onClick={() => navigate("/purchases")}
          >
            <ArrowLeft size={17} />
            Kembali
          </Button>

          <Button variant="secondary" onClick={fetchPurchase}>
            <RefreshCcw size={17} />
            Refresh
          </Button>

          {Number(purchase.remainingAmount || 0) > 0 ? (
            <Button onClick={() => setIsPaymentModalOpen(true)}>
              <WalletCards size={17} />
              Bayar Hutang
            </Button>
          ) : null}
        </div>

        {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}

        <div className="purchase-detail-grid">
          <div className="purchase-detail-main">
            <Card className="purchase-detail-card">
              <div className="purchase-detail-card-header">
                <div>
                  <h2>Ringkasan Transaksi</h2>
                  <p>
                    Nomor pembelian internal:{" "}
                    <strong>{purchase.purchaseNumber || "-"}</strong>
                  </p>
                </div>

                <Badge tone={status.tone}>{status.label}</Badge>
              </div>

              <div className="purchase-info-grid">
                <InfoItem
                  icon={CalendarDays}
                  label="Tanggal Pembelian / Tanggal Utang Usaha"
                  value={formatDateTime(purchase.createdAt)}
                  helper="Tanggal transaksi dibuat. Tanggal pembayaran dicatat terpisah di timeline."
                />

                <InfoItem
                  icon={Truck}
                  label="Supplier"
                  value={purchase.supplier?.name || "-"}
                  helper={purchase.supplier?.phone || purchase.supplier?.address || "-"}
                />

                <InfoItem
                  icon={CreditCard}
                  label="No. Nota/Invoice Supplier"
                  value={purchase.supplierInvoiceNumber || "-"}
                  helper="Opsional, sesuai dokumen dari supplier."
                />

                <InfoItem
                  icon={Package}
                  label="Dibuat Oleh"
                  value={purchase.createdBy?.name || purchase.createdBy?.username || "-"}
                  helper={purchase.createdBy?.role || "-"}
                />
              </div>

              {purchase.note ? (
                <div className="purchase-detail-note">
                  <span>Catatan</span>
                  <p>{purchase.note}</p>
                </div>
              ) : null}
            </Card>

            <Card className="purchase-detail-card">
              <div className="purchase-detail-card-header">
                <div>
                  <h2>Item Pembelian</h2>
                  <p>Daftar barang yang masuk dari transaksi pembelian ini.</p>
                </div>
              </div>

              <Table
                className="purchase-detail-table"
                columns={itemColumns}
                data={purchase.items || []}
                emptyTitle="Item pembelian kosong"
                emptyDescription="Tidak ada item barang dalam transaksi ini."
              />
            </Card>

            <Card className="purchase-detail-card">
              <div className="purchase-detail-card-header">
                <div>
                  <h2>Timeline Pembayaran</h2>
                  <p>
                    Menjelaskan kapan transaksi dibuat, kapan mulai berhutang, dan
                    kapan pembayaran dicatat.
                  </p>
                </div>
              </div>

              <div className="purchase-timeline-explanation">
                <strong>Catatan penting:</strong>
                <span>
                  Tanggal di daftar pembelian adalah tanggal transaksi dibuat.
                  Pembayaran hutang memiliki tanggal sendiri dan tampil di tabel ini.
                </span>
              </div>

              <Table
                className="purchase-payment-table"
                columns={paymentColumns}
                data={paymentTimeline}
                emptyTitle="Belum ada pembayaran"
                emptyDescription="Transaksi ini belum memiliki pembayaran awal maupun pembayaran hutang."
              />
            </Card>
          </div>

          <aside className="purchase-detail-sidebar">
            <Card className="purchase-summary-card">
              <div className="purchase-section-header">
                <div>
                  <h2>Ringkasan Hutang</h2>
                  <p>Status pembayaran transaksi saat ini.</p>
                </div>
              </div>

              <div className="purchase-summary-list">
                <div>
                  <span>Total Pembelian</span>
                  <strong>{formatCurrency(purchase.totalAmount)}</strong>
                </div>

                <div>
                  <span>Sudah Dibayar</span>
                  <strong>{formatCurrency(purchase.paidAmount)}</strong>
                </div>

                <div>
                  <span>Sisa Hutang</span>
                  <strong
                    className={
                      Number(purchase.remainingAmount || 0) > 0 ? "text-danger" : ""
                    }
                  >
                    {formatCurrency(purchase.remainingAmount)}
                  </strong>
                </div>

                <div>
                  <span>Status Bayar</span>
                  <strong>{status.label}</strong>
                </div>
              </div>

              {Number(purchase.remainingAmount || 0) > 0 ? (
                <div className="purchase-summary-actions">
                  <Button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    Bayar Hutang
                  </Button>
                </div>
              ) : (
                <div className="purchase-paid-note">
                  Hutang pembelian ini sudah lunas.
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>

      {isPaymentModalOpen ? (
        <PurchasePaymentModal
          open={isPaymentModalOpen}
          purchase={purchase}
          cashBankAccounts={cashBankAccounts}
          isLoadingCashBankAccounts={isLoadingCashBankAccounts}
          onClose={() => setIsPaymentModalOpen(false)}
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
      await purchaseApi.pay(purchase.id, {
        amount,
        paymentMethod: formValues.paymentMethod,
        cashBankAccountId: formValues.cashBankAccountId,
        note: formValues.note.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
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
              placeholder="Contoh: Pembayaran termin berikutnya"
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

function InfoItem({ icon: Icon, label, value, helper }) {
  return (
    <div className="purchase-info-item">
      <div className="purchase-info-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <p>{helper}</p> : null}
      </div>
    </div>
  );
}

function buildPaymentTimeline(purchase) {
  if (!purchase) {
    return [];
  }

  const payments = Array.isArray(purchase.payablePayments)
    ? purchase.payablePayments
    : [];

  const payablePaymentTotal = payments.reduce((total, payment) => {
    return total + Number(payment.amount || 0);
  }, 0);

  const initialPaymentAmount = Math.max(
    Number(purchase.paidAmount || 0) - payablePaymentTotal,
    0
  );

  const timeline = [];

  if (initialPaymentAmount > 0) {
    timeline.push({
      id: "initial-payment",
      title: "Pembayaran Awal",
      description: "Dibayar saat transaksi pembelian dibuat",
      createdAt: purchase.createdAt,
      amount: initialPaymentAmount,
      paymentMethod: purchase.paymentMethod,
      cashBankAccount: purchase.cashBankAccount,
      createdBy: purchase.createdBy,
      note: purchase.note || "-",
    });
  }

  payments.forEach((payment) => {
    timeline.push({
      id: payment.id,
      title: "Pembayaran Hutang",
      description: "Pembayaran setelah transaksi dibuat",
      createdAt: payment.createdAt,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      cashBankAccount: payment.cashBankAccount,
      createdBy: payment.createdBy,
      note: payment.note,
    });
  });

  return timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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

export default PurchaseDetailPage;