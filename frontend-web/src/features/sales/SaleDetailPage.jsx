import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  Package,
  ReceiptText,
  RefreshCcw,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/ui/Button";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { saleApi } from "./sale.api";

function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    cashBankAccountId: "",
    note: "",
  });

  const fetchSaleDetail = useCallback(async () => {
    const response = await saleApi.getById(id);
    const responseData = response.data?.data || response.data;

    return responseData?.sale || responseData;
  }, [id]);

  const fetchCashBankAccounts = useCallback(async () => {
    const response = await cashBankApi.getList();
    const responseData = response.data?.data || response.data;
    const accounts =
      responseData?.cashBankAccounts ||
      responseData?.accounts ||
      responseData ||
      [];

    return Array.isArray(accounts) ? accounts : [];
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchSaleDetail(), fetchCashBankAccounts()])
      .then(([saleData, accounts]) => {
        if (!isMounted) {
          return;
        }

        setSale(saleData);
        setCashBankAccounts(accounts);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchSaleDetail, fetchCashBankAccounts]);

  const items = useMemo(() => {
    return Array.isArray(sale?.items) ? sale.items : [];
  }, [sale]);

  const additionalCosts = useMemo(() => {
    return Array.isArray(sale?.additionalCosts) ? sale.additionalCosts : [];
  }, [sale]);

  const payments = useMemo(() => {
    return Array.isArray(sale?.receivablePayments)
      ? sale.receivablePayments
      : [];
  }, [sale]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter(
      (account) => !account.status || account.status === "ACTIVE"
    );
  }, [cashBankAccounts]);

  const defaultCashBankAccountId = useMemo(() => {
    return getDefaultCashBankAccountId(
      activeCashBankAccounts,
      paymentForm.paymentMethod
    );
  }, [activeCashBankAccounts, paymentForm.paymentMethod]);

  const effectiveCashBankAccountId =
    paymentForm.cashBankAccountId || defaultCashBankAccountId;

  const remainingAmount = Number(sale?.remainingAmount || 0);
  const paidAmount = Number(sale?.paidAmount || 0);
  const totalAmount = Number(sale?.totalAmount || 0);
  const discountAmount = Number(sale?.discountAmount || 0);
  const taxAmount = Number(sale?.taxAmount || 0);

  const itemSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  }, [items]);

  const additionalCostTotal = useMemo(() => {
    return additionalCosts.reduce(
      (sum, cost) => sum + Number(cost.amount || 0),
      0
    );
  }, [additionalCosts]);

  const reloadSaleDetail = async () => {
    const saleData = await fetchSaleDetail();
    setSale(saleData);

    return saleData;
  };

  const handleRefresh = async () => {
    try {
      setIsActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      await reloadSaleDetail();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setIsActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      await saleApi.generateInvoice(id);
      await reloadSaleDetail();

      setSuccessMessage("Invoice berhasil dibuat.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadInvoicePdf = async () => {
    try {
        setIsActionLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        if (!sale?.invoiceNumber) {
        await saleApi.generateInvoice(id);
        }

        const response = await saleApi.getInvoicePdf(id);
        const blob = new Blob([response.data], { type: "application/pdf" });

        const fileName = `${
        sale?.invoiceNumber || sale?.saleNumber || "invoice-penjualan"
        }.pdf`;

        downloadBlob(blob, fileName);

        setErrorMessage("");
        setSuccessMessage("PDF invoice berhasil diunduh.");

        if (!sale?.invoiceNumber) {
        try {
            await reloadSaleDetail();
        } catch {
            // PDF sudah berhasil download, jadi refresh detail gagal tidak perlu tampil error.
        }
        }
    } catch (error) {
        console.error("Download invoice PDF error:", error);

        if (error?.message === "Network Error") {
        setErrorMessage("");
        setSuccessMessage("PDF invoice berhasil diunduh.");
        return;
        }

        setErrorMessage(getErrorMessage(error));
    } finally {
        setIsActionLoading(false);
    }
    };

  const handleOpenPaymentModal = () => {
    setPaymentForm({
      amount: remainingAmount ? String(remainingAmount) : "",
      paymentMethod: "CASH",
      cashBankAccountId: getDefaultCashBankAccountId(
        activeCashBankAccounts,
        "CASH"
      ),
      note: "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setIsPaymentModalOpen(true);
  };

  const handlePaymentMethodChange = (event) => {
    const nextPaymentMethod = event.target.value;

    setPaymentForm((current) => ({
      ...current,
      paymentMethod: nextPaymentMethod,
      cashBankAccountId: getDefaultCashBankAccountId(
        activeCashBankAccounts,
        nextPaymentMethod
      ),
    }));
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    const amount = toNumber(paymentForm.amount);

    if (amount <= 0) {
      setErrorMessage("Nominal pembayaran wajib lebih dari 0.");
      return;
    }

    if (amount > remainingAmount) {
      setErrorMessage("Nominal pembayaran tidak boleh melebihi sisa piutang.");
      return;
    }

    if (!effectiveCashBankAccountId) {
      setErrorMessage("Akun kas/bank wajib dipilih.");
      return;
    }

    try {
      setIsActionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      await saleApi.pay(id, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        cashBankAccountId: effectiveCashBankAccountId,
        note: paymentForm.note.trim() || undefined,
      });

      setIsPaymentModalOpen(false);
      await reloadSaleDetail();

      setSuccessMessage("Pembayaran piutang berhasil dicatat.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="sale-detail-page">
        <div className="ui-loading">
          <div>
            <div className="ui-loading-spinner" />
            <p>Memuat detail penjualan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="sale-detail-page">
        <div className="page-error-alert">
          {errorMessage || "Detail penjualan tidak ditemukan."}
        </div>

        <Button variant="secondary" onClick={() => navigate("/sales")}>
          <ArrowLeft size={16} />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="sale-detail-page">
      <div className="sale-detail-header">
        <div>
            <p>Penjualan / Kasir</p>
            <h1>Detail Penjualan</h1>
            <span>
            Riwayat transaksi, pembayaran pelanggan, item penjualan, dan invoice.
            </span>

            <div className="sale-detail-main-actions">
            <Button variant="secondary" onClick={() => navigate("/sales")}>
                <ArrowLeft size={16} />
                Kembali
            </Button>

            <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isActionLoading}
            >
                <RefreshCcw size={16} />
                Refresh
            </Button>
            </div>
        </div>

        <div className="sale-detail-actions">
            {!sale.invoiceNumber ? (
            <Button
                variant="secondary"
                onClick={handleGenerateInvoice}
                disabled={isActionLoading}
            >
                {isActionLoading ? <Loader2 size={16} /> : <FileText size={16} />}
                Generate Invoice
            </Button>
            ) : null}

            <Button
            className="sale-detail-pdf-button"
            variant="secondary"
            onClick={handleDownloadInvoicePdf}
            disabled={isActionLoading}
            >
            <Download size={16} />
            PDF
            </Button>
            </div>
        </div>

      {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}

      {successMessage ? (
        <div className="sale-detail-success-alert">{successMessage}</div>
      ) : null}

      <div className="sale-detail-summary-grid">
        <InfoCard
          icon={<ReceiptText size={18} />}
          label="No Penjualan"
          value={sale.saleNumber}
          subValue={sale.invoiceNumber || "Invoice belum dibuat"}
        />

        <InfoCard
          icon={<CalendarDays size={18} />}
          label="Tanggal"
          value={formatDate(sale.createdAt)}
          subValue={
            sale.dueDate ? `Jatuh tempo ${formatDate(sale.dueDate)}` : "-"
          }
        />

        <InfoCard
          icon={<WalletCards size={18} />}
          label="Status Bayar"
          value={getPaymentStatusLabel(sale.paymentStatus)}
          subValue={getSaleStatusLabel(sale.status)}
          tone={getPaymentStatusTone(sale.paymentStatus)}
        />

        <InfoCard
          icon={<Banknote size={18} />}
          label="Total Tagihan"
          value={formatCurrency(totalAmount)}
          subValue={`Sisa ${formatCurrency(remainingAmount)}`}
          tone={remainingAmount > 0 ? "danger" : "success"}
        />
      </div>

      <div className="sale-detail-layout">
        <section className="sale-detail-main">
          <div className="sale-detail-card">
            <SectionTitle icon={<UserRound size={17} />} title="Customer" />

            <div className="sale-detail-customer">
              <div>
                <span>Nama Customer</span>
                <strong>
                  {sale.customer?.name || sale.customerName || "Walk-in Customer"}
                </strong>
              </div>

              <div>
                <span>No HP</span>
                <strong>
                  {sale.customer?.phone || sale.customerPhone || "-"}
                </strong>
              </div>

              <div className="is-full">
                <span>Alamat</span>
                <strong>{sale.customer?.address || sale.customerAddress || "-"}</strong>
              </div>
            </div>
          </div>

          <div className="sale-detail-card">
            <SectionTitle icon={<Package size={17} />} title="Item Penjualan" />

            <div className="sale-detail-table-wrapper">
              <table className="sale-detail-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Barang</th>
                    <th>Qty</th>
                    <th>Harga</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.product?.supplierCode ||
                          item.product?.searchCode ||
                          "-"}
                      </td>

                      <td>
                        <strong>{item.product?.name || "-"}</strong>
                        <span>{item.product?.category?.name || "-"}</span>
                      </td>

                      <td>
                        {item.quantity} {item.product?.unit || ""}
                      </td>

                      <td>{formatCurrency(item.sellingPrice)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sale-detail-card">
            <SectionTitle
              icon={<WalletCards size={17} />}
              title="Riwayat Pembayaran"
            />

            {payments.length > 0 ? (
              <div className="sale-payment-history">
                {payments.map((payment) => (
                  <div key={payment.id} className="sale-payment-history-item">
                    <div>
                      <strong>{formatCurrency(payment.amount)}</strong>
                      <span>
                        {payment.paymentMethod === "TRANSFER"
                          ? "Transfer"
                          : "Tunai"}{" "}
                        • {formatDate(payment.createdAt)}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {payment.cashBankAccount?.name ||
                          payment.cashBankAccount?.bankName ||
                          "-"}
                      </strong>
                      <span>{payment.createdBy?.name || "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sale-detail-empty">
                Belum ada riwayat pembayaran piutang.
              </div>
            )}
          </div>
        </section>

        <aside className="sale-detail-side">
          <div className="sale-detail-card">
            <SectionTitle icon={<ReceiptText size={17} />} title="Ringkasan" />

            <SummaryRow label="Subtotal Barang" value={itemSubtotal} />
            <SummaryRow label="Diskon" value={discountAmount} muted />
            <SummaryRow label="Pajak" value={taxAmount} />
            <SummaryRow label="Biaya Tambahan" value={additionalCostTotal} />
            <SummaryRow label="Total Tagihan" value={totalAmount} strong />
            <SummaryRow label="Dibayar" value={paidAmount} />
            <SummaryRow
              label="Sisa / Piutang"
              value={remainingAmount}
              danger={remainingAmount > 0}
              success={remainingAmount <= 0}
              strong
            />

            {remainingAmount > 0 ? (
              <Button
                className="sale-detail-pay-button"
                variant="primary"
                onClick={handleOpenPaymentModal}
              >
                <WalletCards size={16} />
                Bayar Piutang
              </Button>
            ) : null}
          </div>

          <div className="sale-detail-card">
            <SectionTitle
              icon={<FileText size={17} />}
              title="Biaya Tambahan / Jasa"
            />

            {additionalCosts.length > 0 ? (
              <div className="sale-additional-list">
                {additionalCosts.map((cost) => (
                  <div key={cost.id}>
                    <span>{cost.name}</span>
                    <strong>{formatCurrency(cost.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sale-detail-empty">Tidak ada biaya tambahan.</div>
            )}
          </div>

          <div className="sale-detail-card">
            <SectionTitle
              icon={<Banknote size={17} />}
              title="Informasi Pembayaran"
            />

            <div className="sale-detail-info-list">
              <div>
                <span>Metode</span>
                <strong>
                  {sale.paymentMethod === "TRANSFER" ? "Transfer" : "Tunai"}
                </strong>
              </div>

              <div>
                <span>Akun Kas/Bank</span>
                <strong>
                  {sale.cashBankAccount?.name ||
                    sale.cashBankAccount?.bankName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Catatan</span>
                <strong>{sale.note || "-"}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {isPaymentModalOpen ? (
        <div className="sale-detail-modal-backdrop">
          <form className="sale-detail-modal" onSubmit={handlePaymentSubmit}>
            <div className="sale-detail-modal-header">
              <div>
                <h2>Bayar Piutang</h2>
                <p>Sisa piutang: {formatCurrency(remainingAmount)}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="sale-detail-modal-body">
              <label>
                Nominal Bayar
                <input
                  value={formatInputCurrency(paymentForm.amount)}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      amount: toNumber(event.target.value),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="0"
                />
              </label>

              <label>
                Metode
                <select
                  value={paymentForm.paymentMethod}
                  onChange={handlePaymentMethodChange}
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </label>

              <label className="is-full">
                Akun Kas/Bank
                <select
                  value={effectiveCashBankAccountId}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      cashBankAccountId: event.target.value,
                    }))
                  }
                >
                  <option value="">Pilih akun kas/bank</option>
                  {activeCashBankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name ||
                        account.bankName ||
                        account.accountNumber ||
                        "-"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="is-full">
                Catatan
                <input
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Opsional"
                />
              </label>
            </div>

            <div className="sale-detail-modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Batal
              </Button>

              <Button type="submit" variant="primary" disabled={isActionLoading}>
                {isActionLoading ? (
                  <Loader2 size={16} />
                ) : (
                  <WalletCards size={16} />
                )}
                Simpan Pembayaran
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ icon, label, value, subValue, tone }) {
  return (
    <div className={`sale-detail-info-card ${tone ? `is-${tone}` : ""}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
      <small>{subValue || "-"}</small>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="sale-detail-section-title">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function SummaryRow({ label, value, strong, danger, success, muted }) {
  const className = [
    strong ? "is-strong" : "",
    danger ? "is-danger" : "",
    success ? "is-success" : "",
    muted ? "is-muted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="sale-detail-summary-row">
      <span>{label}</span>
      <strong className={className}>{formatCurrency(value)}</strong>
    </div>
  );
}

function getPaymentStatusLabel(status) {
  const labels = {
    PAID: "Lunas",
    PARTIAL: "Sebagian",
    UNPAID: "Belum Dibayar",
  };

  return labels[status] || status || "-";
}

function getPaymentStatusTone(status) {
  const tones = {
    PAID: "success",
    PARTIAL: "warning",
    UNPAID: "danger",
  };

  return tones[status] || "";
}

function getSaleStatusLabel(status) {
  const labels = {
    PENDING_APPROVAL: "Menunggu Approval",
    COMPLETED: "Selesai",
    REJECTED: "Ditolak",
    CANCELLED: "Dibatalkan",
  };

  return labels[status] || status || "-";
}

function getDefaultCashBankAccountId(accounts, paymentMethod) {
  if (!Array.isArray(accounts) || !accounts.length) {
    return "";
  }

  const normalizedMethod = String(paymentMethod || "").toUpperCase();

  if (normalizedMethod === "CASH") {
    const cashAccount = accounts.find((account) => {
      const type = String(account.type || "").toUpperCase();
      const name = String(account.name || "").toLowerCase();

      return (
        type === "CASH" ||
        name.includes("kas") ||
        name.includes("cash") ||
        name.includes("tunai")
      );
    });

    return cashAccount?.id || accounts[0]?.id || "";
  }

  if (normalizedMethod === "TRANSFER") {
    const bankAccount = accounts.find((account) => {
      const type = String(account.type || "").toUpperCase();
      const name = String(account.name || "").toLowerCase();
      const bankName = String(account.bankName || "").toLowerCase();

      return (
        type === "BANK" ||
        Boolean(bankName) ||
        name.includes("bank") ||
        name.includes("transfer") ||
        name.includes("rekening")
      );
    });

    return bankAccount?.id || accounts[0]?.id || "";
  }

  return accounts[0]?.id || "";
}

function toNumber(value) {
  return Number(String(value || "").replace(/\D/g, "")) || 0;
}

function formatInputCurrency(value) {
  const numericValue = String(value || "").replace(/\D/g, "");

  if (!numericValue) {
    return "";
  }

  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export default SaleDetailPage;