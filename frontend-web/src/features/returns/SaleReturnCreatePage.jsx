import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Save,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import FilterBar from "../../components/form/FilterBar";
import DateRangeFilter from "../../components/form/DateRangeFilter";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { saleApi } from "../sales/sale.api";
import { saleReturnApi } from "./return.api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";

function SaleReturnCreatePage() {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleSearchInput, setSaleSearchInput] = useState("");
  const debouncedSaleSearch = useDebouncedValue(saleSearchInput, 300);

  const [saleFilters, setSaleFilters] = useState({
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
  const [isSaleLoading, setIsSaleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const selectedSaleCardRef = useRef(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [salesResponse, cashBankResponse] = await Promise.all([
        saleApi.getList(),
        cashBankApi.getList(),
      ]);

      const salesData = salesResponse.data?.data || salesResponse.data;
      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;

      const safeSales = Array.isArray(salesData?.sales)
        ? salesData.sales
        : Array.isArray(salesData)
          ? salesData
          : [];

      const safeCashBankAccounts = Array.isArray(cashBankData?.cashBankAccounts)
        ? cashBankData.cashBankAccounts
        : Array.isArray(cashBankData?.accounts)
          ? cashBankData.accounts
          : Array.isArray(cashBankData)
            ? cashBankData
            : [];

      setSales(
        safeSales.filter((sale) => sale.status === "COMPLETED")
      );

      setCashBankAccounts(
        safeCashBankAccounts.filter((account) => account.isActive !== false)
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSales([]);
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

  const handleSaleDateRangeChange = (value) => {
    setSaleFilters((current) => ({
      ...current,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
  };

  const handleSaleFilterChange = (event) => {
      const { name, value } = event.target;

      setSaleFilters((current) => ({
        ...current,
        [name]: value,
      }));
    };

    const handleResetSaleFilter = () => {
    setSaleSearchInput("");

    setSaleFilters({
      dateFrom: "",
      dateTo: "",
      paymentStatus: "",
    });

    setSelectedSaleId("");
    setSelectedSale(null);
    setReturnItems([]);

    setForm((current) => ({
      ...current,
      paymentMethod: "CASH",
      cashBankAccountId: "",
      note: "",
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };

  const filteredSales = useMemo(() => {
    const keyword = debouncedSaleSearch.trim().toLowerCase();

    return sales.filter((sale) => {
      const searchableText = [
        sale.saleNumber,
        sale.invoiceNumber,
        sale.customerName,
        sale.customerPhone,
        sale.customer?.name,
        sale.customer?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      const matchesDate = isDateInRange(
        sale.createdAt,
        saleFilters.dateFrom,
        saleFilters.dateTo
      );

      const matchesPaymentStatus = saleFilters.paymentStatus
        ? sale.paymentStatus === saleFilters.paymentStatus
        : true;

      return matchesSearch && matchesDate && matchesPaymentStatus;
    });
  }, [
    sales,
    debouncedSaleSearch,
    saleFilters.dateFrom,
    saleFilters.dateTo,
    saleFilters.paymentStatus,
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
      const sellingPrice = toNumber(item.sellingPrice);

      return total + quantity * sellingPrice;
    }, 0);
  }, [returnItems]);

  const remainingAmount = Number(selectedSale?.remainingAmount || 0);

  const receivableReductionAmount = Math.min(
    returnTotalAmount,
    remainingAmount
  );

  const refundAmount = Math.max(
    returnTotalAmount - receivableReductionAmount,
    0
  );

  const selectedReturnItems = useMemo(() => {
    return returnItems.filter((item) => toNumber(item.quantity) > 0);
  }, [returnItems]);

  const handleSelectSaleById = async (saleId) => {
    setSelectedSaleId(saleId);
    setSelectedSale(null);
    setReturnItems([]);
    setErrorMessage("");
    setSuccessMessage("");

    if (!saleId) {
      return;
    }

    setIsSaleLoading(true);

    try {
      const response = await saleApi.getById(saleId);
      const responseData = response.data?.data || response.data;
      const sale = responseData?.sale || responseData;

      if (!sale || sale.status !== "COMPLETED") {
        setSelectedSale(null);
        setReturnItems([]);
        setErrorMessage("Transaksi penjualan tidak valid untuk retur.");
        return;
      }

      const saleItems = Array.isArray(sale.items) ? sale.items : [];

      setSelectedSale(sale);
      setReturnItems(
        saleItems.map((item) => ({
          productId: item.productId,
          product: item.product,
          soldQuantity: Number(item.quantity || 0),
          quantity: "",
          sellingPrice: Number(item.sellingPrice || 0),
          condition: "SALEABLE",
          note: "",
        }))
      );

      setForm((current) => ({
        ...current,
        paymentMethod: "CASH",
        cashBankAccountId: "",
      }));

      window.setTimeout(() => {
        selectedSaleCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 180);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSelectedSale(null);
      setReturnItems([]);
    } finally {
      setIsSaleLoading(false);
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
              : Math.min(numericValue, Number(item.soldQuantity || 0));

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedSale) {
      setErrorMessage("Pilih transaksi penjualan terlebih dahulu.");
      return;
    }

    if (!selectedReturnItems.length) {
      setErrorMessage("Pilih minimal satu item untuk diretur.");
      return;
    }

    const invalidItem = selectedReturnItems.find(
      (item) =>
        toNumber(item.quantity) <= 0 ||
        toNumber(item.quantity) > Number(item.soldQuantity || 0)
    );

    if (invalidItem) {
      setErrorMessage("Qty retur tidak valid atau melebihi qty penjualan.");
      return;
    }

    if (refundAmount > 0 && !effectiveCashBankAccountId) {
      setErrorMessage("Akun kas/bank otomatis belum tersedia untuk metode refund ini.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsConfirmModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedSale || !selectedReturnItems.length) {
      setIsConfirmModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        saleId: selectedSale.id,
        paymentMethod: refundAmount > 0 ? form.paymentMethod : undefined,
        cashBankAccountId:
          refundAmount > 0 ? effectiveCashBankAccountId || undefined : undefined,
        note: form.note.trim() || undefined,
        items: selectedReturnItems.map((item) => ({
          productId: item.productId,
          quantity: toNumber(item.quantity),
          condition: item.condition,
          note: item.note.trim() || undefined,
        })),
      };

      await saleReturnApi.create(payload);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 550);
      });

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);

      setSelectedSaleId("");
      setSelectedSale(null);
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
      eyebrow="RETUR / PENJUALAN"
      title="Buat Retur Penjualan"
      description="Pilih transaksi penjualan, tentukan barang yang diretur, kondisi barang, dan refund bila diperlukan."
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

          <Button variant="secondary" onClick={fetchInitialData} disabled={isLoading}>
            <RefreshCcw size={17} />
            Refresh
          </Button>
        </>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={saleSearchInput}
            onChange={setSaleSearchInput}
            placeholder="Cari no penjualan, invoice, atau customer..."
          />

          <DateRangeFilter
            value={{
              dateFrom: saleFilters.dateFrom,
              dateTo: saleFilters.dateTo,
            }}
            onChange={handleSaleDateRangeChange}
          />

          <select
            className="report-filter-select"
            name="paymentStatus"
            value={saleFilters.paymentStatus}
            onChange={handleSaleFilterChange}
          >
            <option value="">Semua Status Bayar</option>
            <option value="PAID">Lunas</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="UNPAID">Belum Dibayar</option>
          </select>

          <Button variant="secondary" size="sm" onClick={handleResetSaleFilter}>
            Reset Filter
          </Button>
        </FilterBar>
      }
    >
      {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}
      {successMessage ? <div className="page-success-alert">{successMessage}</div> : null}

      <form className="return-create-layout" onSubmit={handleSubmit}>
        <section className="return-create-main">

        <div ref={selectedSaleCardRef} className="return-selected-sale-anchor" />
          {selectedSale ? (
            <div className="return-selected-sale-content" key={selectedSale.id}>
          
          <Card className="return-create-card">
            <div className="return-create-card-header">
              <div>
                <PackageCheck size={20} />
              </div>

              <section>
                <span>Transaksi Penjualan</span>
                <strong>
                  {selectedSale
                    ? selectedSale.saleNumber
                    : "Belum ada transaksi dipilih"}
                </strong>
                <p>
                  {selectedSale
                    ? `Tanggal ${formatDate(selectedSale.createdAt)}`
                    : "Cari dan pilih transaksi penjualan yang akan diretur."}
                </p>
              </section>
            </div>

            {selectedSale ? (
              <div className="return-source-grid">
                <div>
                  <span>Customer</span>
                  <strong>
                    {selectedSale.customer?.name ||
                      selectedSale.customerName ||
                      "Walk-in Customer"}
                  </strong>
                  <p>
                    {selectedSale.customer?.phone ||
                      selectedSale.customerPhone ||
                      "-"}
                  </p>
                </div>

                <div>
                  <span>Total Tagihan</span>
                  <strong>{formatCurrency(selectedSale.totalAmount)}</strong>
                  <p>Dibayar {formatCurrency(selectedSale.paidAmount)}</p>
                </div>

                <div>
                  <span>Sisa Piutang</span>
                  <strong>{formatCurrency(selectedSale.remainingAmount)}</strong>
                  <p>Status {getPaymentStatusLabel(selectedSale.paymentStatus)}</p>
                </div>
              </div>
            ) : null}
          </Card>
            </div>
            ) : null}

          <Card className="return-create-card">
            <div className="return-section-title">
              <PackageCheck size={18} />
              <span>Item Retur</span>
            </div>

            {isSaleLoading ? (
              <div className="return-empty-state">Memuat detail penjualan...</div>
            ) : null}

            {!selectedSale && !isSaleLoading ? (
              <div className="return-empty-state">
                Pilih transaksi penjualan terlebih dahulu.
              </div>
            ) : null}

            {selectedSale && returnItems.length ? (
              <div className="return-item-list">
                {returnItems.map((item) => {
                  const productName =
                    item.product?.name || item.productName || "Produk";
                  const productCode =
                    item.product?.code || item.product?.sku || "-";
                  const quantity = toNumber(item.quantity);
                  const subtotal = quantity * toNumber(item.sellingPrice);

                  return (
                    <div className="return-item-row" key={item.productId}>
                      <div className="return-item-info">
                        <strong>{productName}</strong>
                        <span>
                          {productCode} • Terjual {item.soldQuantity}
                        </span>
                        <small>{formatCurrency(item.sellingPrice)} / item</small>
                      </div>

                      <div className="return-item-control">
                        <label>
                          Qty Retur
                          <input
                            type="number"
                            min="0"
                            max={item.soldQuantity}
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
                          Kondisi
                          <select
                            value={item.condition}
                            onChange={(event) =>
                              handleReturnItemChange(
                                item.productId,
                                "condition",
                                event.target.value
                              )
                            }
                          >
                            <option value="SALEABLE">Layak Jual</option>
                            <option value="DAMAGED">Rusak</option>
                          </select>
                        </label>

                        <label>
                          Subtotal
                          <input
                            value={formatCurrency(subtotal)}
                            readOnly
                          />
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
          
        <Card className="return-create-card return-source-picker-card">
            <div className="return-section-title">
              <PackageCheck size={18} />
              <span>Pilih Transaksi Penjualan</span>
            </div>

            {isLoading ? (
              <div className="return-empty-state">Memuat transaksi penjualan...</div>
            ) : null}

            {!isLoading && !filteredSales.length ? (
              <div className="return-empty-state">
                Tidak ada transaksi penjualan yang cocok dengan filter.
              </div>
            ) : null}

            {!isLoading && filteredSales.length ? (
              <div className="return-source-option-list">
                {filteredSales.slice(0, 8).map((sale) => (
                  <button
                    key={sale.id}
                    type="button"
                    className={`return-source-option ${
                      selectedSaleId === sale.id ? "is-active" : ""
                    }`}
                    onClick={() => handleSelectSaleById(sale.id)}
                  >
                    <div>
                      <strong>{sale.saleNumber}</strong>
                      <span>
                        {sale.customer?.name || sale.customerName || "Walk-in Customer"}
                      </span>
                    </div>

                    <section>
                      <strong>{formatCurrency(sale.totalAmount)}</strong>
                      <span>{getPaymentStatusLabel(sale.paymentStatus)}</span>
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
              <span>Potong Piutang</span>
              <strong>{formatCurrency(receivableReductionAmount)}</strong>
            </div>

            <div className="return-summary-side-row">
              <span>Refund Customer</span>
              <strong className={refundAmount > 0 ? "text-danger" : ""}>
                {formatCurrency(refundAmount)}
              </strong>
            </div>

            <div className="return-summary-side-note">
              Retur akan mengurangi piutang terlebih dahulu. Jika nilai retur
              lebih besar dari sisa piutang, selisihnya menjadi refund.
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
              <PackageCheck size={18} />
              <span>Catatan</span>
            </div>

            <textarea
              className="return-note-input"
              name="note"
              value={form.note}
              onChange={handleFormChange}
              placeholder="Catatan retur penjualan..."
              rows={4}
            />

            <Button
              className="return-submit-button"
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedSale || !selectedReturnItems.length}
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
                      Sistem sedang memproses stok, piutang/refund, dan jurnal retur.
                      Mohon tunggu sebentar.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Apakah yakin ingin diretur?</h2>

                    <p>
                      Retur akan memproses stok, pengurangan piutang, refund bila ada,
                      dan jurnal sesuai transaksi ini.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Total Retur</span>
                        <strong>{formatCurrency(returnTotalAmount)}</strong>
                      </div>

                      <div>
                        <span>Potong Piutang</span>
                        <strong>{formatCurrency(receivableReductionAmount)}</strong>
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

                <h2>Pesanan customer berhasil diretur</h2>

                <p>
                  Stok, piutang/refund, dan jurnal retur sudah berhasil diproses
                  oleh sistem.
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
  const bankKeywords = ["bank", "rekening", "bca", "bri", "bni", "mandiri", "transfer"];

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

export default SaleReturnCreatePage;