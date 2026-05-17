import { Eye, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import FilterBar from "../../components/form/FilterBar";
import FormActions from "../../components/form/FormActions";
import FormField from "../../components/form/FormField";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import Textarea from "../../components/ui/Textarea";
import DateRangeFilter from "../../components/form/DateRangeFilter";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDateTime } from "../../utils/formatDateTime";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { productApi } from "../products/product.api";
import { stockOpnameApi } from "./stockOpname.api";

const DEFAULT_PAGE_SIZE = 10;

const createEmptyItem = () => ({
  rowId: crypto.randomUUID(),
  productId: "",
  physicalStock: "",
  note: "",
});

function StockOpnamePage() {
  const [stockOpnames, setStockOpnames] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
      dateFrom: "",
        dateTo: "",
    });

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [opnameNote, setOpnameNote] = useState("");
  const [items, setItems] = useState([createEmptyItem()]);
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStockOpname, setSelectedStockOpname] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchStockOpnames = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await stockOpnameApi.getList({
        page,
        limit: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.stockOpnames ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

        const rawList = Array.isArray(list) ? list : [];

        const filteredList = rawList.filter((opname) => {
        const keyword = debouncedSearch.toLowerCase();

        const matchesSearch = debouncedSearch
            ? opname.opnameNumber?.toLowerCase().includes(keyword) ||
            opname.note?.toLowerCase().includes(keyword) ||
            opname.createdBy?.name?.toLowerCase().includes(keyword) ||
            opname.createdBy?.username?.toLowerCase().includes(keyword)
            : true;

        const matchesDate = isDateInRange(
            opname.createdAt,
            filters.dateFrom,
            filters.dateTo
        );

        return matchesSearch && matchesDate;
        });

      const pagination = responseData?.pagination || responseData?.meta || {};

      setStockOpnames(Array.isArray(filteredList) ? filteredList : []);
      setMeta({
        page: pagination.page || page,
        totalPages: pagination.totalPages || pagination.totalPage || 1,
        totalItems:
            pagination.totalItems ||
            pagination.total ||
            pagination.count ||
            filteredList.length,
        });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStockOpnames([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.dateFrom, filters.dateTo]);

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
      setErrorMessage(getErrorMessage(error));
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchStockOpnames();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchStockOpnames]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProducts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchProducts]);

  const handleSearchChange = (value) => {
    setPage(1);
    setSearchInput(value);
  };

  const handleDateRangeChange = (value) => {
    setPage(1);
    setFilters({
        dateFrom: value.dateFrom,
        dateTo: value.dateTo,
     });
    };

    const handleResetFilter = () => {
    setPage(1);
    setSearchInput("");
    setFilters({
        dateFrom: "",
        dateTo: "",
    });
    };

  const handleOpenCreateModal = () => {
    setOpnameNote("");
    setItems([createEmptyItem()]);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    if (isSubmittingForm) {
      return;
    }

    setIsFormModalOpen(false);
    setFormError("");
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
      currentItems.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleSubmitStockOpname = async (event) => {
    event.preventDefault();

    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      physicalStock: Number(item.physicalStock || 0),
      note: item.note.trim(),
    }));

    if (normalizedItems.some((item) => !item.productId)) {
      setFormError("Semua baris wajib memilih barang.");
      return;
    }

    if (normalizedItems.some((item) => item.physicalStock < 0)) {
      setFormError("Stok fisik tidak boleh negatif.");
      return;
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);

    if (productIds.length !== uniqueProductIds.size) {
      setFormError("Barang tidak boleh duplikat dalam satu stock opname.");
      return;
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    try {
      await stockOpnameApi.create({
        note: opnameNote.trim() || undefined,
        items: normalizedItems.map((item) => ({
          productId: item.productId,
          physicalStock: item.physicalStock,
          note: item.note || undefined,
        })),
      });

      setIsFormModalOpen(false);
      setOpnameNote("");
      setItems([createEmptyItem()]);
      fetchStockOpnames();
      fetchProducts();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenDetailModal = useCallback(async (stockOpname) => {
    setIsDetailModalOpen(true);
    setSelectedStockOpname(stockOpname);
    setIsLoadingDetail(true);

    try {
      const response = await stockOpnameApi.getById(stockOpname.id);
      const responseData = response.data?.data || response.data;
      setSelectedStockOpname(responseData?.stockOpname || responseData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedStockOpname(null);
  };

  const columns = useMemo(
    () => [
      {
        key: "opnameNumber",
        label: "No. Opname",
        width: "220px",
        align: "center",
        render: (row) => (
          <span className="stock-opname-number" title={row.opnameNumber || ""}>
            {row.opnameNumber || "-"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Tanggal",
        width: "180px",
        align: "center",
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "status",
        label: "Status",
        width: "140px",
        align: "center",
        render: (row) => (
          <Badge tone={row.status === "COMPLETED" ? "success" : "danger"}>
            {row.status === "COMPLETED" ? "Selesai" : "Dibatalkan"}
          </Badge>
        ),
      },
      {
        key: "items",
        label: "Jumlah Item",
        width: "130px",
        align: "center",
        render: (row) => `${row.items?.length || 0} Item`,
      },
      {
        key: "difference",
        label: "Total Selisih",
        width: "150px",
        align: "center",
        render: (row) => {
          const totalDifference = getTotalDifference(row.items || []);

          return (
            <strong className={getDifferenceClass(totalDifference)}>
              {formatDifference(totalDifference)}
            </strong>
          );
        },
      },
      {
        key: "createdBy",
        label: "Dibuat Oleh",
        width: "170px",
        align: "center",
        render: (row) => row.createdBy?.name || row.createdBy?.username || "-",
      },
      {
        key: "note",
        label: "Catatan",
        width: "260px",
        align: "center",
        render: (row) => (
          <span className="stock-opname-note" title={row.note || ""}>
            {row.note || "-"}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Aksi",
        width: "130px",
        align: "center",
        render: (row) => (
          <div className="table-actions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenDetailModal(row)}
            >
              <Eye size={15} />
              Detail
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenDetailModal]
  );

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Stock Opname"
        description="Catat hasil pengecekan stok fisik dan sesuaikan stok sistem."
        actions={
          <Button onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Buat Stock Opname
          </Button>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Cari no opname, catatan, atau pembuat..."
            />

            <DateRangeFilter
            value={{
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
            }}
            onChange={handleDateRangeChange}
            />

            <Button variant="secondary" size="sm" onClick={fetchStockOpnames}>
              <RefreshCcw size={15} />
              Refresh
            </Button>

            <Button variant="secondary" size="sm" onClick={handleResetFilter}>
              Reset Filter
            </Button>
          </FilterBar>
        }
      >
        {errorMessage ? (
          <div className="page-error-alert">{errorMessage}</div>
        ) : null}

        <Table
          className="stock-opname-table"
          columns={columns}
          data={stockOpnames}
          isLoading={isLoading}
          emptyTitle="Stock opname belum tersedia"
          emptyDescription="Belum ada stock opname yang cocok dengan filter saat ini."
        />

        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          onPageChange={setPage}
        />
      </ListPageLayout>

      <Modal
        open={isFormModalOpen}
        className="stock-opname-form-modal"
        title="Buat Stock Opname"
        description="Input stok fisik barang. Sistem akan otomatis menghitung selisih dan menyesuaikan stok."
        onClose={handleCloseFormModal}
      >
        <form onSubmit={handleSubmitStockOpname}>
          {formError ? <div className="form-error-alert">{formError}</div> : null}

          <FormField label="Catatan Opname" helper="Opsional.">
            <Textarea
              value={opnameNote}
              onChange={(event) => setOpnameNote(event.target.value)}
              placeholder="Contoh: Stock opname akhir bulan"
            />
          </FormField>

          <div className="stock-opname-items">
            <div className="stock-opname-items-header">
              <strong>Daftar Barang</strong>
              <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}>
                <Plus size={15} />
                Tambah Item
              </Button>
            </div>

            {items.map((item, index) => {
              const selectedProduct = products.find(
                (product) => product.id === item.productId
              );

              const systemStock = selectedProduct?.stock ?? 0;
              const physicalStock =
                item.physicalStock === "" ? "" : Number(item.physicalStock);
              const difference =
                item.physicalStock === "" ? 0 : Number(physicalStock) - systemStock;

              return (
                <div className="stock-opname-item-card" key={item.rowId}>
                  <div className="stock-opname-item-title">
                    <span>Item {index + 1}</span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.rowId)}
                      disabled={items.length === 1}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="stock-opname-item-grid">
                    <FormField label="Barang" required className="form-grid-full">
                      <Select
                        value={item.productId}
                        onChange={(event) =>
                          handleItemChange(item.rowId, "productId", event.target.value)
                        }
                        disabled={isLoadingProducts}
                      >
                        <option value="">
                          {isLoadingProducts ? "Memuat barang..." : "Pilih Barang"}
                        </option>

                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.supplierCode} - {product.name} | Stok:{" "}
                            {product.stock}
                          </option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Stok Sistem">
                      <Input value={selectedProduct ? systemStock : ""} disabled />
                    </FormField>

                    <FormField label="Stok Fisik" required>
                      <Input
                        type="number"
                        value={item.physicalStock}
                        onChange={(event) =>
                          handleItemChange(
                            item.rowId,
                            "physicalStock",
                            event.target.value
                          )
                        }
                        placeholder="0"
                        min="0"
                      />
                    </FormField>

                    <FormField label="Selisih">
                      <Input
                        value={
                          item.physicalStock === "" ? "" : formatDifference(difference)
                        }
                        disabled
                      />
                    </FormField>

                    <FormField label="Catatan Item" helper="Opsional.">
                      <Input
                        value={item.note}
                        onChange={(event) =>
                          handleItemChange(item.rowId, "note", event.target.value)
                        }
                        placeholder="Catatan item"
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>

          <FormActions
            submitLabel="Simpan Stock Opname"
            isSubmitting={isSubmittingForm}
            onCancel={handleCloseFormModal}
          />
        </form>
      </Modal>

      <Modal
        open={isDetailModalOpen}
        className="stock-opname-detail-modal"
        title="Detail Stock Opname"
        description={selectedStockOpname?.opnameNumber || "Memuat detail stock opname"}
        onClose={handleCloseDetailModal}
      >
        {isLoadingDetail ? (
          <div className="ui-loading">
            <div>
              <div className="ui-loading-spinner" />
              <p>Memuat detail...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="stock-opname-detail-summary">
              <div>
                <span>Status</span>
                <strong>
                  {selectedStockOpname?.status === "COMPLETED"
                    ? "Selesai"
                    : "Dibatalkan"}
                </strong>
              </div>

              <div>
                <span>Tanggal</span>
                <strong>{formatDateTime(selectedStockOpname?.createdAt)}</strong>
              </div>

              <div>
                <span>Dibuat Oleh</span>
                <strong>
                  {selectedStockOpname?.createdBy?.name ||
                    selectedStockOpname?.createdBy?.username ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Total Selisih</span>
                <strong
                  className={getDifferenceClass(
                    getTotalDifference(selectedStockOpname?.items || [])
                  )}
                >
                  {formatDifference(
                    getTotalDifference(selectedStockOpname?.items || [])
                  )}
                </strong>
              </div>
            </div>

            <div className="stock-opname-detail-note">
              <span>Catatan</span>
              <p>{selectedStockOpname?.note || "-"}</p>
            </div>

            <div className="stock-opname-detail-items">
              {(selectedStockOpname?.items || []).map((item) => (
                <div className="stock-opname-detail-item" key={item.id}>
                  <div>
                    <strong>{item.product?.name || "-"}</strong>
                    <span>
                      {item.product?.supplierCode || "-"} ·{" "}
                      {item.product?.category?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <span>Sistem</span>
                    <strong>{item.systemStock}</strong>
                  </div>

                  <div>
                    <span>Fisik</span>
                    <strong>{item.physicalStock}</strong>
                  </div>

                  <div>
                    <span>Selisih</span>
                    <strong className={getDifferenceClass(item.difference)}>
                      {formatDifference(item.difference)}
                    </strong>
                  </div>

                  <div>
                    <span>Catatan</span>
                    <strong>{item.note || "-"}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function getTotalDifference(items) {
  return items.reduce((total, item) => total + Number(item.difference || 0), 0);
}

function formatDifference(value) {
  const numberValue = Number(value || 0);

  if (numberValue > 0) {
    return `+${numberValue}`;
  }

  return String(numberValue);
}

function getDifferenceClass(value) {
  const numberValue = Number(value || 0);

  if (numberValue > 0) {
    return "stock-opname-difference is-plus";
  }

  if (numberValue < 0) {
    return "stock-opname-difference is-minus";
  }

  return "stock-opname-difference";
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

export default StockOpnamePage;