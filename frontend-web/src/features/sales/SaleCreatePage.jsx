import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { API_BASE_URL } from "../../constants/api";
import { BRAND } from "../../constants/brand";
import { formatCurrency } from "../../utils/formatCurrency";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { customerApi } from "../customers/customer.api";
import { productApi } from "../products/product.api";
import { saleApi } from "./sale.api";

const ALL_CATEGORY = "Semua";

function SaleCreatePage() {
  const navigate = useNavigate();

  const [now, setNow] = useState(() => new Date());

useEffect(() => {
  const intervalId = window.setInterval(() => {
    setNow(new Date());
  }, 60000);

  return () => {
    window.clearInterval(intervalId);
  };
}, []);

const dateTimeLabel = useMemo(() => {
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return {
    dateLabel,
    timeLabel,
  };
}, [now]);

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [search, setSearch] = useState("");

  const [cartItems, setCartItems] = useState([]);
  const [additionalCosts, setAdditionalCosts] = useState([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerForm, setCustomerForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    dueDate: "",
    note: "",
  });

  const [discountAmount, setDiscountAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [cashReceivedAmount, setCashReceivedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashBankAccountId, setCashBankAccountId] = useState("");

  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const [isSaleSummaryOpen, setIsSaleSummaryOpen] = useState(false);
  const [isSaleConfirmOpen, setIsSaleConfirmOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setIsLoadingInitialData(true);
    setFormError("");

    try {
      const [productResponse, customerResponse, cashBankResponse] =
        await Promise.all([
          productApi.getList({
            status: "ACTIVE",
          }),
          customerApi.getList({
            status: "ACTIVE",
          }),
          cashBankApi.getList(),
        ]);

      const productData = productResponse.data?.data || productResponse.data;
      const customerData = customerResponse.data?.data || customerResponse.data;
      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;

      const productList =
        productData?.products ||
        productData?.items ||
        productData?.data ||
        productData ||
        [];

      const customerList =
        customerData?.customers ||
        customerData?.items ||
        customerData?.data ||
        customerData ||
        [];

      const cashBankList =
        cashBankData?.cashBankAccounts ||
        cashBankData?.items ||
        cashBankData?.data ||
        cashBankData ||
        [];

      setProducts(Array.isArray(productList) ? productList : []);
      setCustomers(Array.isArray(customerList) ? customerList : []);
      setCashBankAccounts(Array.isArray(cashBankList) ? cashBankList : []);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setProducts([]);
      setCustomers([]);
      setCashBankAccounts([]);
    } finally {
      setIsLoadingInitialData(false);
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

  useEffect(() => {
    if (!isSaleSummaryOpen && !isSaleConfirmOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSaleSummaryOpen, isSaleConfirmOpen]);

  const categories = useMemo(() => {
    const categoryNames = products
      .map((product) => product.category?.name)
      .filter(Boolean);

    return [ALL_CATEGORY, ...Array.from(new Set(categoryNames))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = product.category?.name || "-";

      const matchesCategory =
        activeCategory === ALL_CATEGORY || categoryName === activeCategory;

      const matchesSearch = keyword
        ? [
            product.name,
            product.supplierCode,
            product.searchCode,
            categoryName,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter(
      (account) => !account.status || account.status === "ACTIVE"
    );
  }, [cashBankAccounts]);

  const defaultCashBankAccountId = useMemo(() => {
  return getDefaultCashBankAccountId(activeCashBankAccounts, paymentMethod);
}, [activeCashBankAccounts, paymentMethod]);

const effectiveCashBankAccountId =
  cashBankAccountId || defaultCashBankAccountId;

  const selectedProductIds = useMemo(() => {
  return new Set(cartItems.map((item) => item.productId));
  }, [cartItems]);

  const itemSubtotalAmount = useMemo(() => {
    return cartItems.reduce((total, item) => {
      return total + item.quantity * item.sellingPrice;
    }, 0);
  }, [cartItems]);

  const additionalCostAmount = useMemo(() => {
    return additionalCosts.reduce((total, cost) => {
      return total + toNumber(cost.amount);
    }, 0);
  }, [additionalCosts]);

  const normalizedDiscountPercent = clampPercentage(toNumber(discountAmount));
  const normalizedTaxPercent = clampPercentage(toNumber(taxAmount));
  const normalizedCashReceivedAmount = toNumber(cashReceivedAmount);

  const calculatedDiscountAmount = Math.round(
    (itemSubtotalAmount * normalizedDiscountPercent) / 100
  );

  const taxableBaseAmount = Math.max(
    itemSubtotalAmount - calculatedDiscountAmount + additionalCostAmount,
    0
  );

  const calculatedTaxAmount = Math.round(
    (taxableBaseAmount * normalizedTaxPercent) / 100
  );

  const totalAmount = taxableBaseAmount + calculatedTaxAmount;

  const isCashPayment = paymentMethod === "CASH";
  const isTransferPayment = paymentMethod === "TRANSFER";

  const paidAmount = Math.min(normalizedCashReceivedAmount, totalAmount);

  const changeAmount = isCashPayment
    ? Math.max(normalizedCashReceivedAmount - totalAmount, 0)
    : 0;

  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  const paymentStatusLabel = getPaymentStatusLabel({
    totalAmount,
    paidAmount,
  });

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const selectedCashBankAccount = useMemo(() => {
    return activeCashBankAccounts.find(
      (account) => account.id === effectiveCashBankAccountId
    );
  }, [activeCashBankAccounts, effectiveCashBankAccountId]);

  const paymentMethodLabel =
    paymentMethod === "TRANSFER" ? "Transfer" : "Tunai";

  const handleAddProduct = (product) => {
    setFormError("");
    setFormMessage("");

    if (Number(product.stock || 0) <= 0) {
      setFormError("Stok produk ini kosong.");
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, Number(item.stock || 0)),
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          supplierCode: product.supplierCode,
          searchCode: product.searchCode,
          categoryName: product.category?.name || "-",
          unit: product.unit,
          stock: Number(product.stock || 0),
          imageUrl: product.imageUrl,
          quantity: 1,
          sellingPrice: Number(product.sellingPrice || 0),
        },
      ];
    });
  };

  const handleChangeCartItem = (productId, field, value) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleQuantityStep = (productId, step) => {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        const nextQuantity = clampNumber(item.quantity + step, 1, item.stock);

        return {
          ...item,
          quantity: nextQuantity,
        };
      })
    );
  };

  const handleRemoveCartItem = (productId) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId)
    );
  };

  const handleAddAdditionalCost = (presetName = "Jasa Pasang") => {
    setAdditionalCosts((currentCosts) => [
      ...currentCosts,
      {
        id: `cost-${Date.now()}`,
        name: presetName,
        amount: "",
        note: "",
      },
    ]);
  };

  const handleChangeAdditionalCost = (costId, field, value) => {
    setAdditionalCosts((currentCosts) =>
      currentCosts.map((cost) =>
        cost.id === costId
          ? {
              ...cost,
              [field]: value,
            }
          : cost
      )
    );
  };

  const handleRemoveAdditionalCost = (costId) => {
    setAdditionalCosts((currentCosts) =>
      currentCosts.filter((cost) => cost.id !== costId)
    );
  };

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomerForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSelectedCustomerChange = (event) => {
    const value = event.target.value;

    setSelectedCustomerId(value);

    if (!value) {
      return;
    }

    const customer = customers.find((item) => item.id === value);

    if (customer) {
      setCustomerForm((currentForm) => ({
        ...currentForm,
        customerName: customer.name || "",
        customerPhone: customer.phone || "",
      }));
    }
  };

  const handlePaymentMethodChange = (event) => {
  const nextPaymentMethod = event.target.value;

  setPaymentMethod(nextPaymentMethod);

  const defaultAccountId = getDefaultCashBankAccountId(
      activeCashBankAccounts,
      nextPaymentMethod
    );

    setCashBankAccountId(defaultAccountId);
  };

  const validateSaleBeforeSubmit = () => {
    if (!cartItems.length) {
      return "Keranjang masih kosong. Pilih minimal satu produk.";
    }

    const invalidItem = cartItems.find(
      (item) => item.quantity <= 0 || item.sellingPrice <= 0
    );

    if (invalidItem) {
      return "Qty dan harga jual setiap item wajib lebih dari 0.";
    }

    if (totalAmount <= 0) {
      return "Total penjualan wajib lebih dari 0.";
    }

    if (isTransferPayment && normalizedCashReceivedAmount > totalAmount) {
      return "Nominal transfer tidak boleh melebihi total tagihan.";
    }

    if (paidAmount > 0 && !effectiveCashBankAccountId) {
      return "Akun kas/bank wajib dipilih jika ada pembayaran.";
    }

    return "";
  };

  const buildSalePayload = () => {
    const validAdditionalCosts = additionalCosts
      .map((cost) => ({
        name: cost.name.trim(),
        amount: toNumber(cost.amount),
        note: cost.note?.trim() || undefined,
      }))
      .filter((cost) => cost.name && cost.amount > 0);

    return {
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomerId
        ? undefined
        : customerForm.customerName.trim() || "Walk-in Customer",
      customerPhone: selectedCustomerId
        ? undefined
        : customerForm.customerPhone.trim() || undefined,
      paidAmount,
      customerAddress: selectedCustomerId
        ? undefined
        : customerForm.customerAddress.trim() || undefined,
      cashReceivedAmount:
        normalizedCashReceivedAmount > 0
          ? normalizedCashReceivedAmount
          : undefined,
      changeAmount:
        normalizedCashReceivedAmount > 0 ? changeAmount : undefined,
      paymentMethod,
      cashBankAccountId:
        paidAmount > 0 ? effectiveCashBankAccountId : undefined,
      discountAmount: calculatedDiscountAmount,
      taxAmount: calculatedTaxAmount,
      dueDate:
        remainingAmount > 0 && customerForm.dueDate
          ? customerForm.dueDate
          : undefined,
      additionalCosts: validAdditionalCosts,
      note: customerForm.note.trim() || undefined,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      })),
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setFormError("");
    setFormMessage("");

    const validationError = validateSaleBeforeSubmit();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaleSummaryOpen(true);
  };

  const handleCloseSaleSummary = () => {
    if (isSubmitting) {
      return;
    }

    setIsSaleSummaryOpen(false);
  };

  const handleOpenSaleConfirm = () => {
    setIsSaleSummaryOpen(false);
    setIsSaleConfirmOpen(true);
  };

  const handleCloseSaleConfirm = () => {
    if (isSubmitting) {
      return;
    }

    setIsSaleConfirmOpen(false);
  };

  const handleConfirmSubmitSale = async () => {
    setFormError("");
    setFormMessage("");

    const validationError = validateSaleBeforeSubmit();

    if (validationError) {
      setIsSaleConfirmOpen(false);
      setFormError(validationError);
      return;
    }

    const payload = buildSalePayload();

    setIsSubmitting(true);

    try {
      const response = await saleApi.create(payload);

      const responseData = response.data?.data || response.data;
      const createdSale =
        responseData?.sale ||
        responseData?.data?.sale ||
        responseData?.data ||
        responseData;

      if (createdSale?.id) {
        try {
          await saleApi.generateInvoice(createdSale.id);
        } catch (invoiceError) {
          console.error("Failed to generate invoice:", invoiceError);
        }
      }

      setIsSaleConfirmOpen(false);
      setIsSaleSummaryOpen(false);
      setFormMessage("Penjualan berhasil disimpan.");
      navigate("/sales");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="sale-pos-fullscreen">
      <form className="sale-pos-page" onSubmit={handleSubmit}>
        <div className="sale-pos-header">
          <div>
            <span>Penjualan / Kasir</span>
            <h1>KASIR {BRAND.name}</h1>
            <p>
              POS cepat untuk penjualan PVC, wallpaper, aksesoris, jasa pasang,
              dan pembayaran piutang.
            </p>
          </div>

         <div className="sale-pos-header-actions">
              <div className="topbar-v3-date sale-pos-topbar-date">
                <div className="topbar-date-section">
                  <CalendarDays size={17} />
                  <span>{dateTimeLabel.dateLabel}</span>
                </div>

                <div className="topbar-date-divider" />

                <div className="topbar-date-section">
                  <Clock3 size={17} />
                  <span>{dateTimeLabel.timeLabel}</span>
                </div>
              </div>
            </div>
        </div>

        <div className="sale-pos-action-row">
          <Button
            type="button"
            className="sale-pos-back-button"
            onClick={() => navigate("/sales")}
            disabled={isSubmitting}
          >
            <ArrowLeft size={17} />
            Kembali
          </Button>
        </div>

        {formError ? <div className="sale-pos-error">{formError}</div> : null}
        {formMessage ? <div className="sale-pos-message">{formMessage}</div> : null}

        <div className="sale-pos-shell">
          <section className="sale-pos-catalog">
            <Card className="sale-pos-search-card">
              <div className="sale-pos-search">
                <Search size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari produk PVC, kode barang, wallpaper, panel..."
                />
              </div>

              <div className="sale-pos-category-row">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      activeCategory === category
                        ? "sale-pos-category is-active"
                        : "sale-pos-category"
                    }
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="sale-pos-receipt-card">
              <div className="sale-cart-header">
                <div>
                  <span>Receipt</span>
                  <h2>Receipt Transaksi</h2>
                </div>

                <div className="sale-cart-icon">
                  <ShoppingCart size={22} />
                </div>
              </div>

              <div className="sale-customer-panel">
                <div className="sale-panel-title">
                  <UserRound size={16} />
                  <span>Customer</span>
                </div>

                <div className="sale-customer-grid">
                  <label className="sale-payment-full">
                    Pilih Customer
                    <select
                      value={selectedCustomerId}
                      onChange={handleSelectedCustomerChange}
                    >
                      <option value="">Walk-in / Customer Manual</option>

                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.phone ? ` - ${customer.phone}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nama Customer
                    <input
                      name="customerName"
                      value={customerForm.customerName}
                      onChange={handleCustomerChange}
                      placeholder="Walk-in / nama customer"
                      disabled={Boolean(selectedCustomer)}
                    />
                  </label>

                  <label>
                    No HP
                    <input
                      name="customerPhone"
                      value={customerForm.customerPhone}
                      onChange={handleCustomerChange}
                      placeholder="Opsional"
                      disabled={Boolean(selectedCustomer)}
                    />
                  </label>

                  <label className="sale-customer-full">
                    Alamat
                    <input
                      name="customerAddress"
                      value={customerForm.customerAddress}
                      onChange={handleCustomerChange}
                      placeholder="Alamat pelanggan"
                      disabled={Boolean(selectedCustomerId)}
                    />
                  </label>
                </div>
              </div>
            </Card>

            {isLoadingInitialData ? (
              <Card className="sale-pos-loading-card">
                <Loader2 size={24} className="sale-pos-spin" />
                <strong>Memuat produk kasir...</strong>
              </Card>
            ) : (
              <div className="sale-pos-product-grid">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProductIds.has(product.id);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={isSelected ? "sale-product-card is-selected" : "sale-product-card"}
                      onClick={() => handleAddProduct(product)}
                      disabled={Number(product.stock || 0) <= 0}
                    >
                    <div className="sale-product-image">
                      {product.imageUrl ? (
                        <img
                          src={resolveImageUrl(product.imageUrl)}
                          alt={product.name}
                        />
                      ) : (
                        <div className="sale-product-placeholder">
                          <Package size={30} />
                          <span>No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="sale-product-body">
                      <strong>{product.name}</strong>
                      <span>{product.supplierCode || product.searchCode || "-"}</span>
                    </div>

                    <div className="sale-product-meta">
                      <span>
                        Stok {Number(product.stock || 0)} {product.unit || ""}
                      </span>
                      <strong>{formatCurrency(product.sellingPrice)}</strong>
                    </div>

                    <div className="sale-product-add">
                      <Plus size={15} />
                      {isSelected ? "Tambah Lagi" : "Tambah"}
                    </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </section>

          <aside className="sale-pos-cart">
            <Card className="sale-pos-cart-card">
            <div className="sale-cart-header">
                <div>
                  <span>Keranjang</span>
                  <h2>Item Transaksi</h2>
                </div>

                <div className="sale-cart-icon">
                  <ShoppingCart size={22} />
                </div>
              </div>

              <div className="sale-cart-items">
                {cartItems.length ? (
                  cartItems.map((item) => (
                    <div key={item.id} className="sale-cart-item">
                      <div className="sale-cart-item-head">
                          <div className="sale-cart-product-info">
                            <strong>{item.supplierCode || item.searchCode || "-"}</strong>
                            <span>{item.name}</span>
                          </div>

                          <button
                            type="button"
                            className="sale-cart-remove-button"
                            onClick={() => handleRemoveCartItem(item.id)}
                            aria-label="Hapus item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                      <div className="sale-cart-control-grid">
                        <div className="sale-cart-control-field">
                          <span>Qty</span>

                          <div className="sale-qty-control">
                            <button
                              type="button"
                              className="sale-qty-button sale-qty-minus"
                              onClick={() => handleQuantityStep(item.id, -1)}
                            >
                              <Minus size={14} />
                            </button>

                            <input
                              value={item.quantity}
                              onChange={(event) =>
                                handleChangeCartItem(
                                  item.id,
                                  "quantity",
                                  clampNumber(toNumber(event.target.value), 1, item.stock)
                                )
                              }
                              inputMode="numeric"
                            />

                            <button
                              type="button"
                              className="sale-qty-button sale-qty-plus"
                              onClick={() => handleQuantityStep(item.id, 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        <label>
                          Harga Manual
                          <input
                            value={formatInputCurrency(item.sellingPrice)}
                            onChange={(event) =>
                              handleChangeCartItem(
                                item.id,
                                "sellingPrice",
                                toNumber(event.target.value)
                              )
                            }
                            inputMode="numeric"
                          />
                        </label>

                        <label>
                          Subtotal
                          <input
                            value={formatCurrency(
                              item.quantity * item.sellingPrice
                            )}
                            disabled
                          />
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="sale-cart-empty">
                    <Package size={26} />
                    <strong>Keranjang masih kosong</strong>
                    <span>Pilih produk dari katalog sebelah kiri.</span>
                  </div>
                )}
              </div>

             <div className="sale-extra-panel">
                <div className="sale-panel-title">
                  <Wrench size={16} />
                  <span>Biaya Tambahan / Jasa</span>
                </div>

                <div className="sale-extra-actions">
                  <button
                    type="button"
                    onClick={() => handleAddAdditionalCost("Jasa Pasang")}
                  >
                    + Jasa Pasang
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddAdditionalCost("Ongkir")}
                  >
                    + Ongkir
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddAdditionalCost("")}
                  >
                    + Manual
                  </button>
                </div>

                {additionalCosts.length > 0 ? <div className="sale-extra-divider" /> : null}

                {additionalCosts.length > 0 ? (
                  <div className="sale-extra-list">
                    {additionalCosts.map((cost) => (
                      <div key={cost.id} className="sale-extra-row">
                        <input
                          value={cost.name}
                          onChange={(event) =>
                            handleChangeAdditionalCost(
                              cost.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Nama biaya"
                        />

                        <input
                          value={formatInputCurrency(cost.amount)}
                          onChange={(event) =>
                            handleChangeAdditionalCost(
                              cost.id,
                              "amount",
                              toNumber(event.target.value)
                            )
                          }
                          placeholder="0"
                          inputMode="numeric"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalCost(cost.id)}
                          aria-label="Hapus biaya tambahan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="sale-adjustment-panel">
                <div className="sale-panel-title">
                  <WalletCards size={16} />
                  <span>Diskon & Pajak</span>
                </div>

                <div className="sale-payment-grid">
                  <label>
                    Diskon Barang
                    <div className="sale-percent-input">
                      <input
                        value={discountAmount}
                        onChange={(event) =>
                          setDiscountAmount(clampPercentage(toNumber(event.target.value)))
                        }
                        placeholder="0"
                        inputMode="numeric"
                      />
                      <span>%</span>
                    </div>
                  </label>

                  <label>
                    Pajak
                    <div className="sale-percent-input">
                      <input
                        value={taxAmount}
                        onChange={(event) =>
                          setTaxAmount(clampPercentage(toNumber(event.target.value)))
                        }
                        placeholder="0"
                        inputMode="numeric"
                      />
                      <span>%</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="sale-subtotal-panel">
                <div className="sale-panel-title">
                  <Package size={16} />
                  <span>Informasi Subtotal</span>
                </div>

                <div className="sale-summary-panel sale-summary-panel-preview">
                  <SummaryRow label="Subtotal Barang" value={itemSubtotalAmount} />
                  <SummaryRow
                    label={`Diskon (${normalizedDiscountPercent}%)`}
                    value={calculatedDiscountAmount}
                    muted
                  />
                  <SummaryRow
                    label={`Pajak (${normalizedTaxPercent}%)`}
                    value={calculatedTaxAmount}
                  />
                  <SummaryRow label="Biaya Tambahan" value={additionalCostAmount} />
                  <SummaryRow label="Total Sementara" value={totalAmount} strong />
                </div>
              </div>

              <div className="sale-payment-panel">
                <div className="sale-panel-title">
                  <WalletCards size={16} />
                  <span>Pembayaran</span>
                </div>

                <div className="sale-payment-grid">
                  <label className="sale-payment-full">
                    Catatan
                    <input
                      name="note"
                      value={customerForm.note}
                      onChange={handleCustomerChange}
                      placeholder="Opsional"
                    />
                  </label>

                  <label>
                    Metode Pembayaran
                    <select
                      value={paymentMethod}
                      onChange={handlePaymentMethodChange}
                    >
                      <option value="CASH">Tunai</option>
                      <option value="TRANSFER">Transfer</option>
                    </select>
                  </label>

                  <label>
                    {isTransferPayment ? "Nominal Transfer" : "Nominal Pembayaran"}
                    <input
                      value={formatInputCurrency(cashReceivedAmount)}
                      onChange={(event) =>
                        setCashReceivedAmount(toNumber(event.target.value))
                      }
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </label>

                  {paidAmount > 0 ? (
                    <label className="sale-payment-full">
                      Akun Kas/Bank
                      <select
                        value={effectiveCashBankAccountId}
                        onChange={(event) =>
                          setCashBankAccountId(event.target.value)
                        }
                      >
                        <option value="">Pilih akun kas/bank</option>

                        {activeCashBankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                            {account.type ? ` - ${account.type}` : ""}
                            {account.bankName ? ` - ${account.bankName}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="sale-summary-panel">
                <div className="sale-panel-title">
                  <ShoppingCart size={16} />
                  <span>Ringkasan Final</span>
                </div>

                <SummaryRow label="Total Tagihan" value={totalAmount} strong />
                <SummaryRow label="Dibayar Sistem" value={paidAmount} />

                {isCashPayment ? (
                  <SummaryRow
                    label="Kembalian"
                    value={changeAmount}
                    success={changeAmount > 0}
                    strong={changeAmount > 0}
                  />
                ) : null}

                <SummaryRow
                  label="Sisa / Piutang"
                  value={remainingAmount}
                  danger={remainingAmount > 0}
                  strong
                />

                <div className="sale-status-pill">{paymentStatusLabel}</div>
              </div>

              {remainingAmount > 0 ? (
                <div className="sale-receivable-panel">
                  <div className="sale-panel-title">
                    <CalendarDays size={16} />
                    <span>Jatuh Tempo Piutang</span>
                  </div>

                  <div className="sale-payment-grid">
                    <label className="sale-payment-full">
                      Tanggal Jatuh Tempo
                      <input
                        type="date"
                        name="dueDate"
                        value={customerForm.dueDate}
                        onChange={handleCustomerChange}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                className="sale-pos-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Penjualan"}
              </Button>
            </Card>
          </aside>
        </div>
      </form>
      {isSaleSummaryOpen
        ? createPortal(
            <div className="sale-modal-backdrop">
              <div className="sale-modal sale-summary-modal">
                <div className="sale-modal-header">
                  <div>
                    <span>Ringkasan Penjualan</span>
                    <strong>Periksa sebelum simpan</strong>
                    <p>
                      Pastikan customer, pembayaran, dan total transaksi sudah benar.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="sale-modal-close"
                    onClick={handleCloseSaleSummary}
                    disabled={isSubmitting}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="sale-modal-body">
                  <div className="sale-modal-summary-grid">
                    <div className="sale-modal-summary-card">
                      <span>Customer</span>
                      <strong>
                        {selectedCustomer?.name ||
                          customerForm.customerName ||
                          "Walk-in Customer"}
                      </strong>
                      <p>{customerForm.customerPhone || selectedCustomer?.phone || "-"}</p>
                    </div>

                    <div className="sale-modal-summary-card">
                      <span>Jumlah Item</span>
                      <strong>{cartItems.length}</strong>
                      <p>{totalQuantity} qty total</p>
                    </div>

                    <div className="sale-modal-summary-card">
                      <span>Total Tagihan</span>
                      <strong>{formatCurrency(totalAmount)}</strong>
                      <p>Setelah diskon, pajak, dan biaya tambahan</p>
                    </div>

                    <div className="sale-modal-summary-card">
                      <span>Dibayar</span>
                      <strong>{formatCurrency(paidAmount)}</strong>
                      <p>{paymentMethodLabel}</p>
                    </div>

                    <div className="sale-modal-summary-card">
                      <span>Sisa / Piutang</span>
                      <strong className={remainingAmount > 0 ? "text-danger" : ""}>
                        {formatCurrency(remainingAmount)}
                      </strong>
                      <p>{paymentStatusLabel}</p>
                    </div>

                    <div className="sale-modal-summary-card">
                      <span>Akun Kas/Bank</span>
                      <strong>{selectedCashBankAccount?.name || "-"}</strong>
                      <p>
                        {paidAmount > 0
                          ? selectedCashBankAccount?.bankName ||
                            selectedCashBankAccount?.type ||
                            "-"
                          : "Belum ada pembayaran"}
                      </p>
                    </div>
                  </div>

                  <div className="sale-modal-detail-list">
                    {remainingAmount > 0 && customerForm.dueDate ? (
                      <div className="sale-modal-detail-row">
                        <span>Jatuh Tempo Piutang</span>
                        <strong>{customerForm.dueDate}</strong>
                      </div>
                    ) : null}

                    <div className="sale-modal-detail-row">
                      <span>Subtotal Barang</span>
                      <strong>{formatCurrency(itemSubtotalAmount)}</strong>
                    </div>

                    <div className="sale-modal-detail-row">
                      <span>Diskon</span>
                      <strong>{formatCurrency(calculatedDiscountAmount)}</strong>
                    </div>

                    <div className="sale-modal-detail-row">
                      <span>Pajak</span>
                      <strong>{formatCurrency(calculatedTaxAmount)}</strong>
                    </div>

                    <div className="sale-modal-detail-row">
                      <span>Biaya Tambahan</span>
                      <strong>{formatCurrency(additionalCostAmount)}</strong>
                    </div>

                    {customerForm.note ? (
                      <div className="sale-modal-detail-row is-note">
                        <span>Catatan</span>
                        <strong>{customerForm.note}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="sale-modal-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseSaleSummary}
                    disabled={isSubmitting}
                  >
                    Kembali Edit
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleOpenSaleConfirm}
                    disabled={isSubmitting}
                  >
                    Lanjut Simpan
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isSaleConfirmOpen
        ? createPortal(
            <div className="sale-modal-backdrop">
              <div className="sale-modal sale-confirm-modal">
                <div className="sale-confirm-icon">
                  {isSubmitting ? (
                    <Loader2 className="sale-modal-spin" size={28} />
                  ) : (
                    <AlertTriangle size={28} />
                  )}
                </div>

                <div className="sale-confirm-content">
                  <span>Konfirmasi Penjualan</span>
                  <strong>
                    {isSubmitting
                      ? "Menyimpan penjualan..."
                      : "Apakah Anda yakin ingin menyimpan penjualan ini?"}
                  </strong>

                  <p>
                    {isSubmitting
                      ? "Sistem sedang menyimpan transaksi, membuat invoice, dan mencatat data penjualan."
                      : "Pastikan semua item, nominal pembayaran, dan informasi customer sudah benar. Stok akan berkurang setelah transaksi disimpan."}
                  </p>
                </div>

                <div className="sale-modal-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseSaleConfirm}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConfirmSubmitSale}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Menyimpan..." : "Ya, Simpan Penjualan"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </main>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  danger = false,
  success = false,
  muted = false,
}) {
  return (
    <div className="sale-summary-row">
      <span>{label}</span>
      <strong
        className={[
          strong ? "is-strong" : "",
          danger ? "is-danger" : "",
          success ? "is-success" : "",
          muted ? "is-muted" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {formatCurrency(value)}
      </strong>
    </div>
  );
}

function getPaymentStatusLabel({ totalAmount, paidAmount }) {
  if (totalAmount <= 0 || paidAmount <= 0) {
    return "Belum Dibayar";
  }

  if (paidAmount >= totalAmount) {
    return "Lunas";
  }

  return "Sebagian / Piutang";
}

function toNumber(value) {
  const numericValue = String(value || "").replace(/\D/g, "");
  const parsedValue = Number(numericValue || 0);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatInputCurrency(value) {
  const numericValue = String(value || "").replace(/\D/g, "");

  if (!numericValue) {
    return "";
  }

  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

  return `${baseUrl}${imageUrl}`;
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
        name.includes("transfer")
      );
    });

    return bankAccount?.id || accounts[0]?.id || "";
  }

  return accounts[0]?.id || "";
}

export default SaleCreatePage;