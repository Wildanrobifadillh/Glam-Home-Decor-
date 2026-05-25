import {
  ArrowRightLeft,
  ExternalLink,
  Eye,
  PackageCheck,
  PackageX,
  RefreshCcw,
  RotateCcw,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import DateRangeFilter from "../../components/form/DateRangeFilter";
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
import { purchaseReturnApi, saleReturnApi } from "./return.api";

function ReturnListPage() {
  const navigate = useNavigate();

  const [saleReturns, setSaleReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailReturnType, setDetailReturnType] = useState("");
  const [detailReturn, setDetailReturn] = useState(null);

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [saleResponse, purchaseResponse] = await Promise.all([
        saleReturnApi.getList(),
        purchaseReturnApi.getList(),
      ]);

      const saleData = saleResponse.data?.data || saleResponse.data;
      const purchaseData = purchaseResponse.data?.data || purchaseResponse.data;

      setSaleReturns(
        Array.isArray(saleData?.saleReturns) ? saleData.saleReturns : []
      );

      setPurchaseReturns(
        Array.isArray(purchaseData?.purchaseReturns)
          ? purchaseData.purchaseReturns
          : []
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSaleReturns([]);
      setPurchaseReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchReturns();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchReturns]);

  const handleDateRangeChange = (value) => {
    setFilters({
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    });
  };

  const handleResetFilter = () => {
    setSearchInput("");
    setTypeFilter("");
    setFilters({
      dateFrom: "",
      dateTo: "",
    });
  };

  const mergedReturns = useMemo(() => {
    const mappedSaleReturns = saleReturns.map((item) => ({
      ...item,
      returnType: "SALE",
      transactionNumber: item.sale?.saleNumber,
      relationName:
        item.sale?.customer?.name ||
        item.sale?.customerName ||
        "Walk-in Customer",
      relationPhone:
        item.sale?.customer?.phone || item.sale?.customerPhone || "-",
      reductionAmount: item.receivableReductionAmount,
    }));

    const mappedPurchaseReturns = purchaseReturns.map((item) => ({
      ...item,
      returnType: "PURCHASE",
      transactionNumber: item.purchase?.purchaseNumber,
      relationName:
        item.purchase?.supplier?.name || item.purchase?.supplierName || "-",
      relationPhone:
        item.purchase?.supplier?.phone || item.purchase?.supplierPhone || "-",
      reductionAmount: item.payableReductionAmount,
    }));

    return [...mappedSaleReturns, ...mappedPurchaseReturns].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [saleReturns, purchaseReturns]);

  const filteredReturns = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return mergedReturns.filter((item) => {
      const matchesType = typeFilter ? item.returnType === typeFilter : true;

      const matchesDate = isDateInRange(
        item.createdAt,
        filters.dateFrom,
        filters.dateTo
      );

      const searchableText = [
        item.returnNumber,
        item.transactionNumber,
        item.relationName,
        item.relationPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      return matchesType && matchesDate && matchesSearch;
    });
  }, [
    mergedReturns,
    debouncedSearch,
    typeFilter,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const returnSummary = useMemo(() => {
    return filteredReturns.reduce(
      (current, item) => {
        const isSale = item.returnType === "SALE";
        const isPurchase = item.returnType === "PURCHASE";

        return {
          totalCount: current.totalCount + 1,
          saleCount: current.saleCount + (isSale ? 1 : 0),
          purchaseCount: current.purchaseCount + (isPurchase ? 1 : 0),
          totalAmount: current.totalAmount + Number(item.totalAmount || 0),
          refundAmount: current.refundAmount + Number(item.refundAmount || 0),
        };
      },
      {
        totalCount: 0,
        saleCount: 0,
        purchaseCount: 0,
        totalAmount: 0,
        refundAmount: 0,
      }
    );
  }, [filteredReturns]);

  const detailItems = useMemo(() => {
    return Array.isArray(detailReturn?.items) ? detailReturn.items : [];
  }, [detailReturn]);

  const detailMeta = useMemo(() => {
    return getReturnDetailMeta(detailReturn, detailReturnType);
  }, [detailReturn, detailReturnType]);

  const handleOpenReturnDetail = useCallback(async (row, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailReturnType(row.returnType);
    setDetailReturn(null);
    setErrorMessage("");

    try {
      const response =
        row.returnType === "SALE"
          ? await saleReturnApi.getById(row.id)
          : await purchaseReturnApi.getById(row.id);

      const responseData = response.data?.data || response.data;

      const data =
        row.returnType === "SALE"
          ? responseData?.saleReturn || responseData
          : responseData?.purchaseReturn || responseData;

      setDetailReturn(data || null);
    } catch (error) {
      setDetailReturn(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleCloseReturnDetail = () => {
    setIsDetailModalOpen(false);
    setIsDetailLoading(false);
    setDetailReturnType("");
    setDetailReturn(null);
  };

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        label: "Tanggal",
        width: "140px",
        align: "center",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "returnNumber",
        label: "No Retur",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">{row.returnNumber || "-"}</span>
        ),
      },
      {
        key: "returnType",
        label: "Tipe",
        width: "150px",
        align: "center",
        render: (row) => (
          <Badge tone={row.returnType === "SALE" ? "warning" : "success"}>
            {row.returnType === "SALE" ? "Penjualan" : "Pembelian"}
          </Badge>
        ),
      },
      {
        key: "relationName",
        label: "Customer / Supplier",
        width: "260px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.relationName || "-"}</strong>
            <span>{row.relationPhone || "-"}</span>
          </div>
        ),
      },
      {
        key: "totalAmount",
        label: "Total Retur",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.totalAmount),
      },
      {
        key: "reductionAmount",
        label: "Pengurangan",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.reductionAmount),
      },
      {
        key: "refundAmount",
        label: "Refund",
        width: "150px",
        align: "center",
        render: (row) => formatCurrency(row.refundAmount),
      },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (row) => (
          <Badge tone="success">{getReturnStatusLabel(row.status)}</Badge>
        ),
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
            onClick={(event) => handleOpenReturnDetail(row, event)}
          >
            <Eye size={14} />
            Detail
          </Button>
        ),
      },
    ],
    [handleOpenReturnDetail]
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Retur"
      description="Kelola retur penjualan dan retur pembelian, termasuk pengurangan piutang/hutang, refund, dan histori stok."
      actions={
        <>
          <Button
            className="return-action-button"
            variant="primary"
            onClick={() => navigate("/returns/sales/create")}
          >
            <ShoppingCart size={17} />
            Retur Penjualan
          </Button>

          <Button
            className="return-action-button"
            variant="primary"
            onClick={() => navigate("/returns/purchases/create")}
          >
            <Truck size={17} />
            Retur Pembelian
          </Button>
        </>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari no retur, transaksi, customer, atau supplier..."
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
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Semua Tipe Retur</option>
            <option value="SALE">Retur Penjualan</option>
            <option value="PURCHASE">Retur Pembelian</option>
          </select>

          <Button variant="secondary" size="sm" onClick={fetchReturns}>
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

      <div className="return-summary-grid">
        <ReturnSummaryCard
          tone="count"
          icon={<ArrowRightLeft size={20} />}
          label="Total Retur"
          value={returnSummary.totalCount}
          helper="Retur sesuai filter"
        />

        <ReturnSummaryCard
          tone="sale"
          icon={<PackageCheck size={20} />}
          label="Retur Penjualan"
          value={returnSummary.saleCount}
          helper="Barang kembali dari customer"
        />

        <ReturnSummaryCard
          tone="purchase"
          icon={<PackageX size={20} />}
          label="Retur Pembelian"
          value={returnSummary.purchaseCount}
          helper="Barang dikembalikan ke supplier"
        />

        <ReturnSummaryCard
          tone="refund"
          icon={<RotateCcw size={20} />}
          label="Total Refund"
          value={formatCurrency(returnSummary.refundAmount)}
          helper="Nominal refund tercatat"
        />
      </div>

      <Table
        className="return-list-table"
        columns={columns}
        data={filteredReturns}
        isLoading={isLoading}
        emptyTitle="Retur belum tersedia"
        emptyDescription="Belum ada retur penjualan atau pembelian yang cocok dengan filter saat ini."
      />

      {isDetailModalOpen
        ? createPortal(
            <div className="return-detail-modal-backdrop">
              <div className="return-detail-modal">
                <div className="return-detail-modal-header">
                  <div>
                    <span>{detailMeta.typeLabel}</span>
                    <strong>{detailMeta.returnNumber}</strong>
                    <p>
                      {detailMeta.createdAt
                        ? `Tanggal ${formatDate(detailMeta.createdAt)}`
                        : "Memuat detail retur..."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="return-detail-modal-close"
                    onClick={handleCloseReturnDetail}
                  >
                    <X size={20} />
                  </button>
                </div>

                {isDetailLoading ? (
                  <div className="return-empty-state">Memuat detail retur...</div>
                ) : null}

                {!isDetailLoading && detailReturn ? (
                  <>
                    <div className="return-detail-modal-summary">
                      <div>
                        <span>Transaksi Asal</span>
                        <strong>{detailMeta.transactionNumber}</strong>
                      </div>

                      <div>
                        <span>{detailMeta.partnerLabel}</span>
                        <strong>{detailMeta.partnerName}</strong>
                        <p>{detailMeta.partnerPhone}</p>
                      </div>

                      <div>
                        <span>Total Retur</span>
                        <strong>{formatCurrency(detailMeta.totalAmount)}</strong>
                      </div>

                      <div>
                        <span>{detailMeta.reductionLabel}</span>
                        <strong>{formatCurrency(detailMeta.reductionAmount)}</strong>
                      </div>

                      <div>
                        <span>Refund</span>
                        <strong
                          className={
                            Number(detailMeta.refundAmount || 0) > 0
                              ? "text-danger"
                              : ""
                          }
                        >
                          {formatCurrency(detailMeta.refundAmount)}
                        </strong>
                        <p>{detailMeta.paymentMethodLabel}</p>
                      </div>
                    </div>

                    <div className="return-detail-modal-section">
                      <div className="return-section-title">
                        <PackageCheck size={18} />
                        <span>Item Retur</span>
                      </div>

                      <div className="return-detail-modal-items">
                        {detailItems.map((item) => (
                          <div className="return-detail-modal-item" key={item.id}>
                            <div>
                              <strong>{item.product?.name || "-"}</strong>
                              <span>
                                {item.product?.category?.name ||
                                  item.product?.code ||
                                  "-"}
                              </span>
                            </div>

                            <section>
                              <span>Qty</span>
                              <strong>{item.quantity || 0}</strong>
                            </section>

                            <section>
                              <span>Harga</span>
                              <strong>
                                {formatCurrency(
                                  detailReturnType === "SALE"
                                    ? item.sellingPrice
                                    : item.purchasePrice
                                )}
                              </strong>
                            </section>

                            <section>
                              <span>Subtotal</span>
                              <strong>{formatCurrency(item.subtotal)}</strong>
                            </section>

                            <section>
                              <span>Kondisi</span>
                              <strong>
                                {detailReturnType === "SALE"
                                  ? getReturnConditionLabel(item.condition)
                                  : "Retur Supplier"}
                              </strong>
                            </section>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="return-detail-modal-section">
                      <div className="return-section-title">
                        <RotateCcw size={18} />
                        <span>History Retur</span>
                      </div>

                      <div className="return-detail-history">
                        <div>
                          <i />
                          <section>
                            <strong>Retur dibuat</strong>
                            <span>{formatDate(detailReturn.createdAt)}</span>
                          </section>
                        </div>

                        <div>
                          <i />
                          <section>
                            <strong>Stok diproses</strong>
                            <span>
                              {detailReturnType === "SALE"
                                ? "Barang layak jual masuk stok, barang rusak dicatat histori."
                                : "Barang retur pembelian keluar dari stok."}
                            </span>
                          </section>
                        </div>

                        <div>
                          <i />
                          <section>
                            <strong>{detailMeta.reductionLabel} diproses</strong>
                            <span>{formatCurrency(detailMeta.reductionAmount)}</span>
                          </section>
                        </div>

                        {Number(detailMeta.refundAmount || 0) > 0 ? (
                          <div>
                            <i />
                            <section>
                              <strong>Refund diproses</strong>
                              <span>
                                {formatCurrency(detailMeta.refundAmount)} melalui{" "}
                                {detailMeta.cashBankAccountName}
                              </span>
                            </section>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="return-detail-modal-footer">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCloseReturnDetail}
                      >
                        Tutup
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          handleCloseReturnDetail();
                          navigate(
                            detailReturnType === "SALE"
                              ? "/returns/sales/create"
                              : "/returns/purchases/create"
                          );
                        }}
                      >
                        <ExternalLink size={15} />
                        {detailReturnType === "SALE"
                          ? "Buat Retur Penjualan"
                          : "Buat Retur Pembelian"}
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

function ReturnSummaryCard({ tone, icon, label, value, helper }) {
  return (
    <Card className={`return-summary-card return-summary-card-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function getReturnDetailMeta(data, type) {
  const isSale = type === "SALE";
  const source = isSale ? data?.sale : data?.purchase;
  const partner = isSale ? source?.customer : source?.supplier;

  return {
    typeLabel: isSale ? "Retur Penjualan" : "Retur Pembelian",
    partnerLabel: isSale ? "Customer" : "Supplier",
    returnNumber: data?.returnNumber || "-",
    createdAt: data?.createdAt,
    transactionNumber: source?.saleNumber || source?.purchaseNumber || "-",
    partnerName:
      partner?.name ||
      source?.customerName ||
      source?.supplierName ||
      "Walk-in Customer",
    partnerPhone:
      partner?.phone ||
      source?.customerPhone ||
      source?.supplierPhone ||
      "-",
    totalAmount: data?.totalAmount || 0,
    reductionLabel: isSale ? "Pengurangan Piutang" : "Pengurangan Hutang",
    reductionAmount: isSale
      ? data?.receivableReductionAmount || 0
      : data?.payableReductionAmount || 0,
    refundAmount: data?.refundAmount || 0,
    paymentMethodLabel: getReturnPaymentMethodLabel(data?.paymentMethod),
    cashBankAccountName:
      data?.cashBankAccount?.name ||
      data?.cashBankAccount?.bankName ||
      data?.cashBankAccount?.accountNumber ||
      "Tidak ada refund",
  };
}

function getReturnConditionLabel(condition) {
  const labels = {
    SALEABLE: "Layak Jual",
    DAMAGED: "Rusak",
  };

  return labels[condition] || condition || "-";
}

function getReturnPaymentMethodLabel(method) {
  const labels = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
  };

  return labels[method] || "Tidak ada refund";
}

function getReturnStatusLabel(status) {
  const labels = {
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  return labels[status] || status || "-";
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

export default ReturnListPage;