import {
  ArrowDownCircle,
  ArrowUpCircle,
  PackageMinus,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react";
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
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { categoryApi } from "../categories/category.api";
import { productApi } from "../products/product.api";
import { inventoryApi } from "./inventory.api";

const DEFAULT_PAGE_SIZE = 10;

const emptyFormValues = {
  quantity: "",
  newStock: "",
  note: "",
};

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    categoryId: "",
    stockStatus: "",
  });

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mutationType, setMutationType] = useState("IN");
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await productApi.getList({
        page,
        limit: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: "ACTIVE",
        categoryId: filters.categoryId || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.products ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const productList = Array.isArray(list) ? list : [];

      const filteredProducts = filters.stockStatus
        ? productList.filter((product) => getStockStatus(product).value === filters.stockStatus)
        : productList;

      const pagination = responseData?.pagination || responseData?.meta || {};

      setProducts(filteredProducts);
      setMeta({
        page: pagination.page || page,
        totalPages: pagination.totalPages || pagination.totalPage || 1,
        totalItems:
          pagination.totalItems ||
          pagination.total ||
          pagination.count ||
          filteredProducts.length,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.categoryId, filters.stockStatus]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);

    try {
      const response = await categoryApi.getList({
        status: "ACTIVE",
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.categories ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      setCategories(Array.isArray(list) ? list : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProducts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchProducts]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchCategories();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchCategories]);

  const handleSearchChange = (value) => {
    setPage(1);
    setSearchInput(value);
  };

  const handleCategoryFilterChange = (event) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      categoryId: event.target.value,
    }));
  };

  const handleStockStatusFilterChange = (event) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      stockStatus: event.target.value,
    }));
  };

  const handleResetFilter = () => {
    setPage(1);
    setSearchInput("");
    setFilters({
      categoryId: "",
      stockStatus: "",
    });
  };

  const handleOpenMutationModal = (product, type) => {
    setSelectedProduct(product);
    setMutationType(type);
    setFormValues(emptyFormValues);
    setFormError("");
    setIsMutationModalOpen(true);
  };

  const handleCloseMutationModal = () => {
    if (isSubmittingForm) return;

    setSelectedProduct(null);
    setFormError("");
    setIsMutationModalOpen(false);
  };

  const handleFormChange = (event) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmitMutation = async (event) => {
    event.preventDefault();

    if (!selectedProduct) {
      setFormError("Barang belum dipilih.");
      return;
    }

    const quantity = Number(formValues.quantity || 0);
    const newStock = Number(formValues.newStock || 0);
    const note = formValues.note.trim();

    if (mutationType === "ADJUSTMENT") {
      if (newStock < 0) {
        setFormError("Stok baru tidak boleh negatif.");
        return;
      }

      if (!note) {
        setFormError("Catatan penyesuaian wajib diisi.");
        return;
      }
    } else {
      if (quantity <= 0) {
        setFormError("Jumlah wajib lebih dari 0.");
        return;
      }

      if ((mutationType === "OUT" || mutationType === "DAMAGED") && quantity > selectedProduct.stock) {
        setFormError("Jumlah tidak boleh melebihi stok saat ini.");
        return;
      }

      if (mutationType === "DAMAGED" && !note) {
        setFormError("Catatan barang rusak wajib diisi.");
        return;
      }
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    try {
      if (mutationType === "IN") {
        await inventoryApi.stockIn({
          productId: selectedProduct.id,
          quantity,
          note: note || undefined,
        });
      }

      if (mutationType === "OUT") {
        await inventoryApi.stockOut({
          productId: selectedProduct.id,
          quantity,
          note: note || undefined,
        });
      }

      if (mutationType === "DAMAGED") {
        await inventoryApi.damagedStock({
          productId: selectedProduct.id,
          quantity,
          note,
        });
      }

      if (mutationType === "ADJUSTMENT") {
        await inventoryApi.stockAdjustment({
          productId: selectedProduct.id,
          newStock,
          note,
        });
      }

      setIsMutationModalOpen(false);
      setSelectedProduct(null);
      setFormValues(emptyFormValues);
      fetchProducts();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "supplierCode",
        label: "Kode Barang",
        width: "160px",
        align: "center",
        render: (row) => <strong>{row.supplierCode || "-"}</strong>,
      },
      {
        key: "name",
        label: "Nama Barang",
        width: "260px",
        align: "center",
        render: (row) => (
          <div className="inventory-product-cell">
            <strong>{row.name || "-"}</strong>
            <span>{row.category?.name || "-"}</span>
          </div>
        ),
      },
      {
        key: "category",
        label: "Kategori",
        width: "160px",
        align: "center",
        render: (row) => row.category?.name || "-",
      },
      {
        key: "unit",
        label: "Satuan",
        width: "120px",
        align: "center",
        render: (row) => row.unit || "-",
      },
      {
        key: "stock",
        label: "Stok Saat Ini",
        width: "150px",
        align: "center",
        render: (row) => <strong>{row.stock}</strong>,
      },
      {
        key: "stockStatus",
        label: "Status Stok",
        width: "150px",
        align: "center",
        render: (row) => {
          const status = getStockStatus(row);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "actions",
        label: "Aksi",
        width: "390px",
        align: "center",
        render: (row) => (
        <div className="inventory-stock-actions">
          <Button
            size="sm"
            variant="secondary"
            className="stock-action-button is-in"
            onClick={() => handleOpenMutationModal(row, "IN")}
          >
            <ArrowDownCircle size={15} />
            Masuk
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="stock-action-button is-out"
            onClick={() => handleOpenMutationModal(row, "OUT")}
          >
            <ArrowUpCircle size={15} />
            Keluar
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="stock-action-button is-damaged"
            onClick={() => handleOpenMutationModal(row, "DAMAGED")}
          >
            <PackageMinus size={15} />
            Rusak
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="stock-action-button is-adjust"
            onClick={() => handleOpenMutationModal(row, "ADJUSTMENT")}
          >
            <SlidersHorizontal size={15} />
            Adjust
          </Button>
        </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Inventory"
        description="Pantau stok barang saat ini dan lakukan aksi mutasi stok."
        filters={
          <FilterBar>
            <SearchInput
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Cari kode atau nama barang..."
            />

            <Select
              value={filters.categoryId}
              onChange={handleCategoryFilterChange}
              disabled={isLoadingCategories}
            >
              <option value="">
                {isLoadingCategories ? "Memuat kategori..." : "Semua Kategori"}
              </option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select
              value={filters.stockStatus}
              onChange={handleStockStatusFilterChange}
            >
              <option value="">Semua Status Stok</option>
              <option value="SAFE">Aman</option>
              <option value="LOW">Stok Rendah</option>
              <option value="EMPTY">Habis</option>
            </Select>

            <Button variant="secondary" size="sm" onClick={fetchProducts}>
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
          className="inventory-stock-table"
          columns={columns}
          data={products}
          isLoading={isLoading}
          emptyTitle="Inventory belum tersedia"
          emptyDescription="Belum ada barang aktif yang cocok dengan filter saat ini."
        />

        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          onPageChange={setPage}
        />
      </ListPageLayout>

      <Modal
        open={isMutationModalOpen}
        className="inventory-form-modal"
        title={getMutationModalTitle(mutationType)}
        description={getMutationModalDescription(mutationType)}
        onClose={handleCloseMutationModal}
      >
        <form onSubmit={handleSubmitMutation}>
          {formError ? <div className="form-error-alert">{formError}</div> : null}

          <div className="inventory-selected-product">
            <span>Barang</span>
            <strong>{selectedProduct?.name || "-"}</strong>
            <small>
              {selectedProduct?.supplierCode || "-"} · Stok saat ini:{" "}
              {selectedProduct?.stock ?? "-"}
            </small>
          </div>

          <div className="form-grid">
            {mutationType === "ADJUSTMENT" ? (
              <FormField
                label="Stok Baru"
                required
                helper="Stok barang akan disamakan dengan angka ini."
              >
                <Input
                  type="number"
                  name="newStock"
                  value={formValues.newStock}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </FormField>
            ) : (
              <FormField label="Jumlah" required>
                <Input
                  type="number"
                  name="quantity"
                  value={formValues.quantity}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="1"
                />
              </FormField>
            )}

            <FormField
              label="Catatan"
              required={mutationType === "ADJUSTMENT" || mutationType === "DAMAGED"}
              helper={
                mutationType === "ADJUSTMENT" || mutationType === "DAMAGED"
                  ? "Wajib diisi untuk penyesuaian atau barang rusak."
                  : "Opsional."
              }
              className="form-grid-full"
            >
              <Textarea
                name="note"
                value={formValues.note}
                onChange={handleFormChange}
                placeholder="Masukkan catatan mutasi stok"
              />
            </FormField>
          </div>

          <FormActions
            submitLabel="Simpan Mutasi"
            isSubmitting={isSubmittingForm}
            onCancel={handleCloseMutationModal}
          />
        </form>
      </Modal>
    </>
  );
}

function getStockStatus(product) {
  const stock = Number(product.stock || 0);
  const minStock = Number(product.minStock || 0);

  if (stock <= 0) {
    return {
      value: "EMPTY",
      label: "Habis",
      tone: "danger",
    };
  }

  if (stock <= minStock) {
    return {
      value: "LOW",
      label: "Stok Rendah",
      tone: "warning",
    };
  }

  return {
    value: "SAFE",
    label: "Aman",
    tone: "success",
  };
}

function getMutationModalTitle(type) {
  if (type === "IN") return "Barang Masuk";
  if (type === "OUT") return "Barang Keluar";
  if (type === "DAMAGED") return "Barang Rusak";
  if (type === "ADJUSTMENT") return "Penyesuaian Stok";

  return "Mutasi Stok";
}

function getMutationModalDescription(type) {
  if (type === "IN") return "Tambahkan stok barang secara manual.";
  if (type === "OUT") return "Kurangi stok barang untuk kebutuhan keluar manual.";
  if (type === "DAMAGED") return "Catat barang rusak dan kurangi stok barang.";
  if (type === "ADJUSTMENT") return "Sesuaikan stok barang berdasarkan kondisi fisik.";

  return "Catat mutasi stok barang.";
}

export default InventoryPage;