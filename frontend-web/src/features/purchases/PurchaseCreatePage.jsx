import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CurrencyInput from "../../components/form/CurrencyInput";
import FormField from "../../components/form/FormField";
import ModuleHeader from "../../components/layout/ModuleHeader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import { formatCurrency } from "../../utils/formatCurrency";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { productApi } from "../products/product.api";
import { supplierApi } from "../suppliers/supplier.api";
import { purchaseApi } from "./purchase.api";

const createEmptyItem = () => ({
  rowId: crypto.randomUUID(),
  productId: "",
  quantity: "",
  purchasePrice: "",
});

const initialFormValues = {
  supplierId: "",
  supplierInvoiceNumber: "",
  paidAmount: "",
  paymentMethod: "CASH",
  cashBankAccountId: "",
  note: "",
};

function PurchaseCreatePage() {
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState(initialFormValues);
  const [items, setItems] = useState([createEmptyItem()]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCashBankAccounts, setIsLoadingCashBankAccounts] =
    useState(false);

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setFormError(getErrorMessage(error));
      setSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);

    try {
      const response = await productApi.getList({
        status: "ACTIVE",
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.products ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
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
      setFormError(getErrorMessage(error));
      setCashBankAccounts([]);
    } finally {
      setIsLoadingCashBankAccounts(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchSuppliers();
      fetchProducts();
      fetchCashBankAccounts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchSuppliers, fetchProducts, fetchCashBankAccounts]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter(
      (account) => !account.status || account.status === "ACTIVE"
    );
  }, [cashBankAccounts]);

  const totalAmount = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity || 0);
      const purchasePrice = Number(item.purchasePrice || 0);

      return total + quantity * purchasePrice;
    }, 0);
  }, [items]);

  const paidAmount = Number(formValues.paidAmount || 0);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const paymentStatus = getPaymentStatusPreview(totalAmount, paidAmount);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
      ...(name === "paidAmount" && Number(value || 0) <= 0
        ? {
            cashBankAccountId: "",
          }
        : {}),
    }));
  };

  const handleAddItem = () => {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
  };

  const handleRemoveItem = (rowId) => {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.rowId !== rowId);
    });
  };

  const handleItemChange = (rowId, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.rowId !== rowId) {
          return item;
        }

        if (field === "productId") {
          const selectedProduct = products.find((product) => product.id === value);

          return {
            ...item,
            productId: value,
            purchasePrice:
              selectedProduct?.purchasePrice !== undefined
                ? String(selectedProduct.purchasePrice)
                : item.purchasePrice,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const supplierId = formValues.supplierId;
    const supplierInvoiceNumber = formValues.supplierInvoiceNumber.trim();
    const note = formValues.note.trim();

    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity || 0),
      purchasePrice: Number(item.purchasePrice || 0),
    }));

    if (!supplierId) {
      setFormError("Supplier wajib dipilih.");
      return;
    }

    if (!normalizedItems.length) {
      setFormError("Minimal harus ada satu item pembelian.");
      return;
    }

    if (normalizedItems.some((item) => !item.productId)) {
      setFormError("Semua baris item wajib memilih barang.");
      return;
    }

    if (normalizedItems.some((item) => item.quantity <= 0)) {
      setFormError("Qty setiap item wajib lebih dari 0.");
      return;
    }

    if (normalizedItems.some((item) => item.purchasePrice <= 0)) {
      setFormError("Harga beli setiap item wajib lebih dari 0.");
      return;
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);

    if (productIds.length !== uniqueProductIds.size) {
      setFormError("Barang tidak boleh duplikat dalam satu pembelian.");
      return;
    }

    if (totalAmount <= 0) {
      setFormError("Total pembelian wajib lebih dari 0.");
      return;
    }

    if (paidAmount < 0) {
      setFormError("Nominal dibayar tidak boleh negatif.");
      return;
    }

    if (paidAmount > totalAmount) {
      setFormError("Nominal dibayar tidak boleh melebihi total pembelian.");
      return;
    }

    if (paidAmount > 0 && !formValues.cashBankAccountId) {
      setFormError("Akun kas/bank wajib dipilih jika ada pembayaran awal.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await purchaseApi.create({
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber || undefined,
        paidAmount,
        paymentMethod: formValues.paymentMethod,
        cashBankAccountId:
          paidAmount > 0 ? formValues.cashBankAccountId : undefined,
        note: note || undefined,
        items: normalizedItems,
      });

      const responseData = response.data?.data || response.data;
      const purchase = responseData?.purchase || responseData;

      if (purchase?.id) {
        navigate(`/purchases/${purchase.id}`);
        return;
      }

      navigate("/purchases");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="purchase-create-page">
      <ModuleHeader
        eyebrow=""
        title="Tambah Pembelian"
        description="Catat pembelian barang dari supplier, pembayaran awal, dan item barang yang masuk."
        />

        <div className="purchase-page-toolbar">
        <Button
            type="button"
            className="purchase-back-button"
            onClick={() => navigate("/purchases")}
        >
            <ArrowLeft size={17} />
            Kembali
        </Button>
        </div>

      <form onSubmit={handleSubmit} className="purchase-create-form">
        {formError ? <div className="form-error-alert">{formError}</div> : null}

        <div className="purchase-create-grid">
          <div className="purchase-create-main">
            <Card className="purchase-form-card purchase-info-card">
              <div className="purchase-section-header">
                <div>
                  <h2>Informasi Pembelian</h2>
                  <p>Pilih supplier dan masukkan nomor invoice supplier bila ada.</p>
                </div>
              </div>

              <div className="form-grid">
                <FormField label="Supplier" required>
                  <Select
                    name="supplierId"
                    value={formValues.supplierId}
                    onChange={handleFormChange}
                    disabled={isLoadingSuppliers}
                  >
                    <option value="">
                      {isLoadingSuppliers ? "Memuat supplier..." : "Pilih Supplier"}
                    </option>

                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Invoice Supplier" helper="Opsional.">
                  <Input
                    name="supplierInvoiceNumber"
                    value={formValues.supplierInvoiceNumber}
                    onChange={handleFormChange}
                    placeholder="Contoh: INV-SUP-001"
                  />
                </FormField>

                <FormField label="Catatan" helper="Opsional." className="form-grid-full">
                  <Textarea
                    name="note"
                    value={formValues.note}
                    onChange={handleFormChange}
                    placeholder="Masukkan catatan pembelian"
                  />
                </FormField>
              </div>
            </Card>

            <Card className="purchase-form-card">
              <div className="purchase-section-header">
                <div>
                  <h2>Item Pembelian</h2>
                  <p>Tambahkan barang yang dibeli dari supplier.</p>
                </div>

                <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}>
                  <Plus size={15} />
                  Tambah Item
                </Button>
              </div>

              <div className="purchase-items">
                {items.map((item, index) => {
                  const selectedProduct = products.find(
                    (product) => product.id === item.productId
                  );

                  const subtotal =
                    Number(item.quantity || 0) * Number(item.purchasePrice || 0);

                  return (
                    <div className="purchase-item-card" key={item.rowId}>
                      <div className="purchase-item-title">
                        <span>Item {index + 1}</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.rowId)}
                          disabled={items.length === 1}
                          aria-label="Hapus item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="purchase-item-grid">
                        <FormField label="Barang" required className="form-grid-full">
                          <Select
                            value={item.productId}
                            onChange={(event) =>
                              handleItemChange(
                                item.rowId,
                                "productId",
                                event.target.value
                              )
                            }
                            disabled={isLoadingProducts}
                          >
                            <option value="">
                              {isLoadingProducts ? "Memuat barang..." : "Pilih Barang"}
                            </option>

                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.supplierCode} - {product.name} | Stok:{" "}
                                {product.stock} | Harga:{" "}
                                {formatCurrency(product.purchasePrice)}
                              </option>
                            ))}
                          </Select>
                        </FormField>

                        <FormField label="Satuan">
                          <Input value={selectedProduct?.unit || ""} disabled />
                        </FormField>

                        <FormField label="Stok Saat Ini">
                          <Input value={selectedProduct?.stock ?? ""} disabled />
                        </FormField>

                        <FormField label="Qty" required>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(event) =>
                              handleItemChange(
                                item.rowId,
                                "quantity",
                                event.target.value
                              )
                            }
                            placeholder="0"
                            min="1"
                          />
                        </FormField>

                        <FormField label="Harga Beli" required>
                          <CurrencyInput
                            value={item.purchasePrice}
                            onChange={(event) =>
                              handleItemChange(
                                item.rowId,
                                "purchasePrice",
                                event.target.value
                              )
                            }
                            placeholder="0"
                          />
                        </FormField>

                        <FormField label="Subtotal">
                          <Input value={formatCurrency(subtotal)} disabled />
                        </FormField>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="purchase-form-card purchase-payment-card">
              <div className="purchase-section-header">
                <div>
                  <h2>Pembayaran Awal</h2>
                  <p>Isi nominal dibayar jika pembelian langsung dibayar sebagian atau lunas.</p>
                </div>
              </div>

              <div className="form-grid">
                    <FormField label="Nominal Dibayar" helper="Isi 0 jika belum dibayar.">
                        <CurrencyInput
                        name="paidAmount"
                        value={formValues.paidAmount}
                        onChange={handleFormChange}
                        placeholder="0"
                        />
                    </FormField>

                    {paidAmount > 0 ? (
                        <>
                        <FormField label="Metode Pembayaran" required>
                            <Select
                            name="paymentMethod"
                            value={formValues.paymentMethod}
                            onChange={handleFormChange}
                            >
                            <option value="CASH">Tunai</option>
                            <option value="TRANSFER">Transfer</option>
                            </Select>
                        </FormField>

                        <FormField label="Akun Kas/Bank" required className="form-grid-full">
                            <Select
                            name="cashBankAccountId"
                            value={formValues.cashBankAccountId}
                            onChange={handleFormChange}
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
                        </>
                        ) : (
                            <div className="purchase-payment-empty-note">
                                 Belum ada pembayaran awal. Transaksi akan tercatat sebagai hutang pembelian.
                            </div>
                        )}
                    </div>
            </Card>
          </div>

          <aside className="purchase-create-sidebar">
            <Card className="purchase-summary-card">
              <div className="purchase-section-header">
                <div>
                  <h2>Ringkasan</h2>
                  <p>Preview nilai pembelian sebelum disimpan.</p>
                </div>
              </div>

              <div className="purchase-summary-list">
                <div>
                  <span>Total Pembelian</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>

                <div>
                  <span>Dibayar</span>
                  <strong>{formatCurrency(paidAmount)}</strong>
                </div>

                <div>
                  <span>Sisa Hutang</span>
                  <strong className={remainingAmount > 0 ? "text-danger" : ""}>
                    {formatCurrency(remainingAmount)}
                  </strong>
                </div>

                <div>
                  <span>Status Bayar</span>
                  <strong>{paymentStatus.label}</strong>
                </div>
              </div>
              <div className="purchase-summary-actions">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/purchases")}
                    disabled={isSubmitting}
                >
                    Batal
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Pembelian"}
                </Button>
            </div>
            {formError ? (
                <div className="purchase-summary-error" role="alert" aria-live="polite">
                    <strong>Periksa kembali data pembelian</strong>
                    <span>{formError}</span>
                </div>
                ) : null}
            </Card>
          </aside>
        </div>
      </form>
    </div>
  );
}

function getPaymentStatusPreview(totalAmount, paidAmount) {
  if (totalAmount <= 0 || paidAmount <= 0) {
    return {
      value: "UNPAID",
      label: "Belum Lunas",
    };
  }

  if (paidAmount < totalAmount) {
    return {
      value: "PARTIAL",
      label: "Sebagian",
    };
  }

  return {
    value: "PAID",
    label: "Lunas",
  };
}

export default PurchaseCreatePage;