import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackageX,
  RefreshCcw,
  RotateCcw,
  Save,
  Truck,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { purchaseApi } from "../purchases/purchase.api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { purchaseReturnApi } from "./return.api";

function PurchaseReturnCreatePage() {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseSearchInput, setPurchaseSearchInput] = useState("");
  const debouncedPurchaseSearch = useDebouncedValue(purchaseSearchInput, 300);

  const [purchaseFilters, setPurchaseFilters] = useState({
    dateFrom: "",
    dateTo: "",
    paymentStatus: "",
  });

  const [returnItems, setReturnItems] = useState([]);
  const [form, setForm] = useState({
    paymentMethod: "CASH",
    cashBankAccountId: "",
    note: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const selectedPurchaseCardRef = useRef(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [purchaseResponse, cashBankResponse] = await Promise.all([
        purchaseApi.getList(),
        cashBankApi.getList(),
      ]);

      const purchaseData = purchaseResponse.data?.data || purchaseResponse.data;
      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;

      const safePurchases = Array.isArray(purchaseData?.purchases)
        ? purchaseData.purchases
        : Array.isArray(purchaseData)
          ? purchaseData
          : [];

      const safeCashBankAccounts = Array.isArray(cashBankData?.cashBankAccounts)
        ? cashBankData.cashBankAccounts
        : Array.isArray(cashBankData?.accounts)
          ? cashBankData.accounts
          : Array.isArray(cashBankData)
            ? cashBankData
            : [];

      setPurchases(
        safePurchases.filter((purchase) => purchase.status === "COMPLETED")
      );

      setCashBankAccounts(
        safeCashBankAccounts.filter((account) => account.isActive !== false)
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPurchases([]);
      setCashBankAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchInitialData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchInitialData]);

  const handlePurchaseDateRangeChange = (value) => {
    setPurchaseFilters((current) => ({
      ...current,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
  };

  const handlePurchaseFilterChange = (event) => {
    const { name, value } = event.target;

    setPurchaseFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetPurchaseFilter = () => {
    setPurchaseSearchInput("");

    setPurchaseFilters({
      dateFrom: "",
      dateTo: "",
      paymentStatus: "",
    });

    setSelectedPurchaseId("");
    setSelectedPurchase(null);
    setReturnItems([]);

    setForm({
      paymentMethod: "CASH",
      cashBankAccountId: "",
      note: "",
    });

    setSuccessMessage("");
    setErrorMessage("");
  };

  const filteredPurchases = useMemo(() => {
    const keyword = debouncedPurchaseSearch.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const searchableText = [
        purchase.purchaseNumber,
        purchase.supplierInvoiceNumber,
        purchase.supplierName,
        purchase.supplierPhone,
        purchase.supplier?.name,
        purchase.supplier?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      const matchesDate = isDateInRange(
        purchase.createdAt,
        purchaseFilters.dateFrom,
        purchaseFilters.dateTo
      );

      const matchesPaymentStatus = purchaseFilters.paymentStatus
        ? purchase.paymentStatus === purchaseFilters.paymentStatus
        : true;

      return matchesSearch && matchesDate && matchesPaymentStatus;
    });
  }, [
    purchases,
    debouncedPurchaseSearch,
    purchaseFilters.dateFrom,
    purchaseFilters.dateTo,
    purchaseFilters.paymentStatus,
  ]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter((account) => account.isActive !== false);
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

  const returnTotalAmount = useMemo(() => {
    return returnItems.reduce((total, item) => {
      const quantity = toNumber(item.quantity);
      const purchasePrice = toNumber(item.purchasePrice);

      return total + quantity * purchasePrice;
    }, 0);
  }, [returnItems]);

  const remainingAmount = Number(selectedPurchase?.remainingAmount || 0);

  const payableReductionAmount = Math.min(returnTotalAmount, remainingAmount);

  const refundAmount = Math.max(returnTotalAmount - payableReductionAmount, 0);

  const selectedReturnItems = useMemo(() => {
    return returnItems.filter((item) => toNumber(item.quantity) > 0);
  }, [returnItems]);

  const handleSelectPurchaseById = async (purchaseId) => {
    setSelectedPurchaseId(purchaseId);
    setSelectedPurchase(null);
    setReturnItems([]);
    setErrorMessage("");
    setSuccessMessage("");

    if (!purchaseId) {
      return;
    }

    setIsPurchaseLoading(true);

    try {
      const response = await purchaseApi.getById(purchaseId);
      const responseData = response.data?.data || response.data;
      const purchase = responseData?.purchase || responseData;

      if (!purchase || purchase.status !== "COMPLETED") {
        setSelectedPurchase(null);
        setReturnItems([]);
        setErrorMessage("Transaksi pembelian tidak valid untuk retur.");
        return;
      }

      const purchaseItems = Array.isArray(purchase.items) ? purchase.items : [];

      setSelectedPurchase(purchase);
      setReturnItems(
        purchaseItems.map((item) => ({
          productId: item.productId,
          product: item.product,
          purchasedQuantity: Number(item.quantity || 0),
          quantity: "",
          purchasePrice: Number(item.purchasePrice || 0),
          note: "",
        }))
      );

      setForm((current) => ({
        ...current,
        paymentMethod: "CASH",
        cashBankAccountId: "",
      }));

      window.setTimeout(() => {
        selectedPurchaseCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 180);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSelectedPurchase(null);
      setReturnItems([]);
    } finally {
      setIsPurchaseLoading(false);
    }
  };

  const handleReturnItemChange = (productId, field, value) => {
    setReturnItems((current) =>
      current.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        if (field === "quantity") {
          const numericValue = value === "" ? "" : Math.max(toNumber(value), 0);
          const safeQuantity =
            numericValue === ""
              ? ""
              : Math.min(numericValue, Number(item.purchasedQuantity || 0));

          return {
            ...item,
            quantity: safeQuantity,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "paymentMethod") {
        return {
          ...current,
          paymentMethod: value,
          cashBankAccountId: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedPurchase) {
      setErrorMessage("Pilih transaksi pembelian terlebih dahulu.");
      return;
    }

    if (!selectedReturnItems.length) {
      setErrorMessage("Pilih minimal satu item untuk diretur.");
      return;
    }

    const invalidItem = selectedReturnItems.find(
      (item) =>
        toNumber(item.quantity) <= 0 ||
        toNumber(item.quantity) > Number(item.purchasedQuantity || 0)
    );

    if (invalidItem) {
      setErrorMessage("Qty retur tidak valid atau melebihi qty pembelian.");
      return;
    }

    if (refundAmount > 0 && !effectiveCashBankAccountId) {
      setErrorMessage(
        "Akun kas/bank otomatis belum tersedia untuk metode refund ini."
      );
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsConfirmModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedPurchase || !selectedReturnItems.length) {
      setIsConfirmModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        purchaseId: selectedPurchase.id,
        paymentMethod: refundAmount > 0 ? form.paymentMethod : undefined,
        cashBankAccountId:
          refundAmount > 0 ? effectiveCashBankAccountId || undefined : undefined,
        note: form.note.trim() || undefined,
        items: selectedReturnItems.map((item) => ({
          productId: item.productId,
          quantity: toNumber(item.quantity),
          note: item.note.trim() || undefined,
        })),
      };

      await purchaseReturnApi.create(payload);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 550);
      });

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);

      setSelectedPurchaseId("");
      setSelectedPurchase(null);
      setReturnItems([]);
      setForm({
        paymentMethod: "CASH",
        cashBankAccountId: "",
        note: "",
      });

      await fetchInitialData();
    } catch (error) {
      setIsConfirmModalOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ListPageLayout
      eyebrow="RETUR / PEMBELIAN"
      title="Buat Retur Pembelian"
      description="Pilih transaksi pembelian, tentukan barang yang dikembalikan ke supplier, dan refund bila diperlukan."
      actions={
        <>
          <Button
            className="return-create-back-button"
            variant="secondary"
            onClick={() => navigate("/returns")}
          >
            <ArrowLeft size={17} />
            Kembali
          </Button>

          <Button
            variant="secondary"
            onClick={fetchInitialData}
            disabled={isLoading}
          >
            <RefreshCcw size={17} />
            Refresh
          </Button>
        </>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={purchaseSearchInput}
            onChange={setPurchaseSearchInput}
            placeholder="Cari no pembelian, invoice, atau supplier..."
          />

          <DateRangeFilter
            value={{
              dateFrom: purchaseFilters.dateFrom,
              dateTo: purchaseFilters.dateTo,
            }}
            onChange={handlePurchaseDateRangeChange}
          />

          <select
            className="report-filter-select"
            name="paymentStatus"
            value={purchaseFilters.paymentStatus}
            onChange={handlePurchaseFilterChange}
          >
            <option value="">Semua Status Bayar</option>
            <option value="PAID">Lunas</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="UNPAID">Belum Dibayar</option>
          </select>

          <Button variant="secondary" size="sm" onClick={handleResetPurchaseFilter}>
            Reset Filter
          </Button>
        </FilterBar>
      }
    >
      {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}
      {successMessage ? <div className="page-success-alert">{successMessage}</div> : null}

      <form className="return-create-layout" onSubmit={handleSubmit}>
        <section className="return-create-main">
          <div
            ref={selectedPurchaseCardRef}
            className="return-selected-sale-anchor"
          />

          {selectedPurchase ? (
            <div
              className="return-selected-sale-content"
              key={selectedPurchase.id}
            >
              <Card className="return-create-card">
                <div className="return-create-card-header">
                  <div>
                    <Truck size={20} />
                  </div>

                  <section>
                    <span>Transaksi Pembelian</span>
                    <strong>{selectedPurchase.purchaseNumber}</strong>
                    <p>
                      Tanggal {formatDate(selectedPurchase.createdAt)}
                    </p>
                  </section>
                </div>

                <div className="return-source-grid">
                  <div>
                    <span>Supplier</span>
                    <strong>
                      {selectedPurchase.supplier?.name ||
                        selectedPurchase.supplierName ||
                        "-"}
                    </strong>
                    <p>
                      {selectedPurchase.supplier?.phone ||
                        selectedPurchase.supplierPhone ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <span>Total Pembelian</span>
                    <strong>{formatCurrency(selectedPurchase.totalAmount)}</strong>
                    <p>Dibayar {formatCurrency(selectedPurchase.paidAmount)}</p>
                  </div>

                  <div>
                    <span>Sisa Hutang</span>
                    <strong>
                      {formatCurrency(selectedPurchase.remainingAmount)}
                    </strong>
                    <p>
                      Status{" "}
                      {getPaymentStatusLabel(selectedPurchase.paymentStatus)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="return-create-card">
                <div className="return-section-title">
                  <PackageX size={18} />
                  <span>Item Retur</span>
                </div>

                {isPurchaseLoading ? (
                  <div className="return-empty-state">
                    Memuat detail pembelian...
                  </div>
                ) : null}

                {selectedPurchase && returnItems.length ? (
                  <div className="return-item-list">
                    {returnItems.map((item) => {
                      const productName =
                        item.product?.name || item.productName || "Produk";
                      const productCode =
                        item.product?.code || item.product?.sku || "-";
                      const quantity = toNumber(item.quantity);
                      const subtotal = quantity * toNumber(item.purchasePrice);

                      return (
                        <div className="return-item-row" key={item.productId}>
                          <div className="return-item-info">
                            <strong>{productName}</strong>
                            <span>
                              {productCode} • Dibeli {item.purchasedQuantity}
                            </span>
                            <small>
                              {formatCurrency(item.purchasePrice)} / item
                            </small>
                          </div>

                          <div className="return-item-control">
                            <label>
                              Qty Retur
                              <input
                                type="number"
                                min="0"
                                max={item.purchasedQuantity}
                                value={item.quantity}
                                onChange={(event) =>
                                  handleReturnItemChange(
                                    item.productId,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                placeholder="0"
                              />
                            </label>

                            <label>
                              Subtotal
                              <input value={formatCurrency(subtotal)} readOnly />
                            </label>

                            <label className="is-full">
                              Catatan Item
                              <input
                                value={item.note}
                                onChange={(event) =>
                                  handleReturnItemChange(
                                    item.productId,
                                    "note",
                                    event.target.value
                                  )
                                }
                                placeholder="Opsional"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </Card>
            </div>
          ) : null}

          <Card className="return-create-card return-source-picker-card">
            <div className="return-section-title">
              <PackageX size={18} />
              <span>Pilih Transaksi Pembelian</span>
            </div>

            {isLoading ? (
              <div className="return-empty-state">
                Memuat transaksi pembelian...
              </div>
            ) : null}

            {!isLoading && !filteredPurchases.length ? (
              <div className="return-empty-state">
                Tidak ada transaksi pembelian yang cocok dengan filter.
              </div>
            ) : null}

            {!isLoading && filteredPurchases.length ? (
              <div className="return-source-option-list">
                {filteredPurchases.slice(0, 8).map((purchase) => (
                  <button
                    key={purchase.id}
                    type="button"
                    className={`return-source-option ${
                      selectedPurchaseId === purchase.id ? "is-active" : ""
                    }`}
                    onClick={() => handleSelectPurchaseById(purchase.id)}
                  >
                    <div>
                      <strong>{purchase.purchaseNumber}</strong>
                      <span>
                        {purchase.supplier?.name ||
                          purchase.supplierName ||
                          "-"}
                      </span>
                    </div>

                    <section>
                      <strong>{formatCurrency(purchase.totalAmount)}</strong>
                      <span>{getPaymentStatusLabel(purchase.paymentStatus)}</span>
                    </section>
                  </button>
                ))}
              </div>
            ) : null}
          </Card>
        </section>

        <aside className="return-create-side">
          <Card className="return-create-card return-summary-side-card">
            <div className="return-section-title">
              <RotateCcw size={18} />
              <span>Ringkasan Retur</span>
            </div>

            <div className="return-summary-side-row">
              <span>Total Retur</span>
              <strong>{formatCurrency(returnTotalAmount)}</strong>
            </div>

            <div className="return-summary-side-row">
              <span>Potong Hutang</span>
              <strong>{formatCurrency(payableReductionAmount)}</strong>
            </div>

            <div className="return-summary-side-row">
              <span>Refund Supplier</span>
              <strong className={refundAmount > 0 ? "text-danger" : ""}>
                {formatCurrency(refundAmount)}
              </strong>
            </div>

            <div className="return-summary-side-note">
              Retur akan mengurangi hutang supplier terlebih dahulu. Jika nilai
              retur lebih besar dari sisa hutang, selisihnya menjadi refund.
            </div>
          </Card>

          {refundAmount > 0 ? (
            <Card className="return-create-card">
              <div className="return-section-title">
                <RotateCcw size={18} />
                <span>Refund</span>
              </div>

              <div className="return-refund-fields">
                <label>
                  Metode Refund
                  <select
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleFormChange}
                  >
                    <option value="CASH">Tunai</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </label>

                <label>
                  Akun Kas/Bank
                  <input
                    className="return-readonly-input"
                    value={effectiveCashBankAccountLabel}
                    readOnly
                  />
                </label>
              </div>
            </Card>
          ) : null}

          <Card className="return-create-card">
            <div className="return-section-title">
              <PackageX size={18} />
              <span>Catatan</span>
            </div>

            <textarea
              className="return-note-input"
              name="note"
              value={form.note}
              onChange={handleFormChange}
              placeholder="Catatan retur pembelian..."
              rows={4}
            />

            <Button
              className="return-submit-button"
              type="submit"
              variant="primary"
              disabled={
                isSubmitting || !selectedPurchase || !selectedReturnItems.length
              }
            >
              <Save size={17} />
              {isSubmitting ? "Menyimpan..." : "Simpan Retur"}
            </Button>
          </Card>
        </aside>
      </form>

      {isConfirmModalOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmitting ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses retur...</h2>

                    <p>
                      Sistem sedang memproses stok, hutang/refund, dan jurnal
                      retur pembelian. Mohon tunggu sebentar.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Apakah yakin ingin diretur?</h2>

                    <p>
                      Retur pembelian akan mengurangi stok, memproses hutang
                      supplier/refund bila ada, dan membuat jurnal sesuai
                      transaksi ini.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Total Retur</span>
                        <strong>{formatCurrency(returnTotalAmount)}</strong>
                      </div>

                      <div>
                        <span>Potong Hutang</span>
                        <strong>{formatCurrency(payableReductionAmount)}</strong>
                      </div>

                      <div>
                        <span>Refund</span>
                        <strong>{formatCurrency(refundAmount)}</strong>
                      </div>
                    </div>

                    <div className="return-confirm-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsConfirmModalOpen(false)}
                        disabled={isSubmitting}
                      >
                        Tidak
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmReturn}
                        disabled={isSubmitting}
                      >
                        Ya, Retur
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

                <h2>Retur pembelian berhasil diproses</h2>

                <p>
                  Stok, hutang/refund, dan jurnal retur pembelian sudah berhasil
                  diproses oleh sistem.
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
    </ListPageLayout>
  );
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

function getPaymentStatusLabel(status) {
  const labels = {
    PAID: "Lunas",
    PARTIAL: "Sebagian",
    UNPAID: "Belum Dibayar",
  };

  return labels[status] || status || "-";
}

function toNumber(value) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default PurchaseReturnCreatePage;