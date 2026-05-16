import { Edit, Plus, Power, RefreshCcw } from "lucide-react";
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
import { categoryApi } from "../categories/category.api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { productApi } from "./product.api";

const DEFAULT_PAGE_SIZE = 10;

const emptyFormValues = {
  supplierCode: "",
  name: "",
  categoryId: "",
  unit: "",
  purchasePrice: "",
  sellingPrice: "",
  minStock: "",
  stock: "",
};

function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    categoryId: "",
  });

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
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
        status: filters.status || undefined,
        categoryId: filters.categoryId || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.products ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const pagination = responseData?.pagination || responseData?.meta || {};

      setProducts(Array.isArray(list) ? list : []);
      setMeta({
        page: pagination.page || page,
        totalPages: pagination.totalPages || pagination.totalPage || 1,
        totalItems:
          pagination.totalItems ||
          pagination.total ||
          pagination.count ||
          (Array.isArray(list) ? list.length : 0),
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.status, filters.categoryId]);

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

  const handleStatusChange = (event) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      status: event.target.value,
    }));
  };

  const handleCategoryFilterChange = (event) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      categoryId: event.target.value,
    }));
  };

  const handleResetFilter = () => {
    setPage(1);
    setSearchInput("");
    setFilters({
      status: "",
      categoryId: "",
    });
  };

  const handleOpenCreateModal = () => {
    setFormMode("create");
    setSelectedProduct(null);
    setFormValues(emptyFormValues);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((product) => {
    setFormMode("edit");
    setSelectedProduct(product);
    setFormValues({
      supplierCode: product.supplierCode || "",
      name: product.name || "",
      categoryId: product.categoryId || "",
      unit: product.unit || "",
      purchasePrice: String(product.purchasePrice ?? ""),
      sellingPrice: String(product.sellingPrice ?? ""),
      minStock: String(product.minStock ?? ""),
      stock: String(product.stock ?? ""),
    });
    setFormError("");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    if (isSubmittingForm) {
      return;
    }

    setIsFormModalOpen(false);
    setSelectedProduct(null);
    setFormError("");
  };

  const handleFormChange = (event) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();

    const supplierCode = formValues.supplierCode.trim();
    const name = formValues.name.trim();
    const categoryId = formValues.categoryId;
    const unit = formValues.unit.trim();
    const purchasePrice = Number(formValues.purchasePrice || 0);
    const sellingPrice = Number(formValues.sellingPrice || 0);
    const minStock = Number(formValues.minStock || 0);
    const stock = Number(formValues.stock || 0);

    if (!supplierCode) {
      setFormError("Kode barang wajib diisi.");
      return;
    }

    if (!name) {
      setFormError("Nama barang wajib diisi.");
      return;
    }

    if (!categoryId) {
      setFormError("Kategori wajib dipilih.");
      return;
    }

    if (!unit) {
      setFormError("Satuan wajib diisi.");
      return;
    }

    if (purchasePrice < 0 || sellingPrice < 0 || minStock < 0 || stock < 0) {
      setFormError("Harga dan stok tidak boleh bernilai negatif.");
      return;
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    const payload = {
      supplierCode,
      name,
      categoryId,
      unit,
      purchasePrice,
      sellingPrice,
      minStock,
    };

    if (formMode === "create") {
      payload.stock = stock;
    }

    try {
      if (formMode === "edit" && selectedProduct) {
        await productApi.update(selectedProduct.id, payload);
      } else {
        await productApi.create(payload);
      }

      setIsFormModalOpen(false);
      setSelectedProduct(null);
      setFormValues(emptyFormValues);

      fetchProducts();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenStatusModal = useCallback((product) => {
    setSelectedProduct(product);
    setIsStatusModalOpen(true);
  }, []);

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) {
      return;
    }

    setSelectedProduct(null);
    setIsStatusModalOpen(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedProduct) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage("");

    try {
      if (selectedProduct.status === "ACTIVE") {
        await productApi.deactivate(selectedProduct.id);
      } else {
        await productApi.activate(selectedProduct.id);
      }

      setIsStatusModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "supplierCode",
        label: "Kode Barang",
        width: "150px",
        align: "center",
        render: (row) => <strong>{row.supplierCode || "-"}</strong>,
      },
      {
        key: "name",
        label: "Nama Barang",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center product-name-cell">
            <strong>{row.name || "-"}</strong>
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
        width: "110px",
        align: "center",
        render: (row) => row.unit || "-",
      },
      {
        key: "purchasePrice",
        label: "Harga Beli",
        width: "150px",
        align: "center",
        render: (row) => formatCurrency(row.purchasePrice),
      },
      {
        key: "sellingPrice",
        label: "Harga Jual",
        width: "150px",
        align: "center",
        render: (row) => formatCurrency(row.sellingPrice),
      },
      {
        key: "stock",
        label: "Stok",
        width: "100px",
        align: "center",
        render: (row) => (
          <Badge tone={row.stock <= row.minStock ? "warning" : "success"}>
            {row.stock}
          </Badge>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "140px",
        align: "center",
        render: (row) => (
          <Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>
            {row.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
          </Badge>
        ),
      },
      {
        key: "actions",
        label: "Aksi",
        width: "220px",
        align: "center",
        render: (row) => (
          <div className="table-actions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenEditModal(row)}
            >
              <Edit size={15} />
              Edit
            </Button>

            <Button
              size="sm"
              variant={row.status === "ACTIVE" ? "danger" : "secondary"}
              onClick={() => handleOpenStatusModal(row)}
            >
              <Power size={15} />
              {row.status === "ACTIVE" ? "Nonaktif" : "Aktifkan"}
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenEditModal, handleOpenStatusModal]
  );

  const selectedProductNextStatus =
    selectedProduct?.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan";

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Barang"
        description="Kelola data barang, harga, kategori, satuan, dan status stok."
        actions={
          <Button onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Tambah Barang
          </Button>
        }
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
            >
              <option value="">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select value={filters.status} onChange={handleStatusChange}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
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
        {errorMessage ? (
          <div className="page-error-alert">{errorMessage}</div>
        ) : null}

        <Table
          className="product-table"
          columns={columns}
          data={products}
          isLoading={isLoading}
          emptyTitle="Barang belum tersedia"
          emptyDescription="Belum ada barang yang cocok dengan filter saat ini."
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
        className="product-form-modal"
        title={formMode === "edit" ? "Edit Barang" : "Tambah Barang"}
        description={
          formMode === "edit"
            ? "Perbarui data barang. Stok dikelola lewat modul inventory."
            : "Tambahkan barang baru ke master data."
        }
        onClose={handleCloseFormModal}
      >
        <form onSubmit={handleSubmitProduct}>
            {formError ? <div className="form-error-alert">{formError}</div> : null}
          <div className="form-grid">
            <FormField label="Kode Barang" required>
              <Input
                name="supplierCode"
                value={formValues.supplierCode}
                onChange={handleFormChange}
                placeholder="Contoh: PVC-PLF-001"
                autoFocus
              />
            </FormField>

            <FormField label="Nama Barang" required>
              <Input
                name="name"
                value={formValues.name}
                onChange={handleFormChange}
                placeholder="Masukkan nama barang"
              />
            </FormField>

            <FormField label="Kategori" required>
              <Select
                name="categoryId"
                value={formValues.categoryId}
                onChange={handleFormChange}
                disabled={isLoadingCategories}
              >
                <option value="">
                  {isLoadingCategories ? "Memuat kategori..." : "Pilih Kategori"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Satuan" required helper="Contoh: pcs, dus, meter, lembar.">
              <Input
                name="unit"
                value={formValues.unit}
                onChange={handleFormChange}
                placeholder="Masukkan satuan"
              />
            </FormField>

            <FormField label="Harga Beli" required>
              <Input
                type="number"
                name="purchasePrice"
                value={formValues.purchasePrice}
                onChange={handleFormChange}
                placeholder="0"
                min="0"
              />
            </FormField>

            <FormField label="Harga Jual">
              <Input
                type="number"
                name="sellingPrice"
                value={formValues.sellingPrice}
                onChange={handleFormChange}
                placeholder="0"
                min="0"
              />
            </FormField>

            <FormField label="Minimum Stok">
              <Input
                type="number"
                name="minStock"
                value={formValues.minStock}
                onChange={handleFormChange}
                placeholder="0"
                min="0"
              />
            </FormField>

            {formMode === "create" ? (
              <FormField
                label="Stok Awal"
                helper="Stok hanya muncul saat tambah barang."
              >
                <Input
                  type="number"
                  name="stock"
                  value={formValues.stock}
                  onChange={handleFormChange}
                  placeholder="0"
                  min="0"
                />
              </FormField>
            ) : null}
          </div>

          <FormActions
            submitLabel={formMode === "edit" ? "Simpan Perubahan" : "Simpan"}
            isSubmitting={isSubmittingForm}
            onCancel={handleCloseFormModal}
          />
        </form>
      </Modal>

      <Modal
        open={isStatusModalOpen}
        title={`${selectedProductNextStatus} Barang`}
        description="Perubahan status barang akan mempengaruhi data yang tampil di sistem."
        onClose={handleCloseStatusModal}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={handleCloseStatusModal}
              disabled={isUpdatingStatus}
            >
              Batal
            </Button>

            <Button
              variant={selectedProduct?.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus
                ? "Memproses..."
                : `${selectedProductNextStatus} Barang`}
            </Button>
          </>
        }
      >
        <p className="modal-confirm-text">
          Apakah Anda yakin ingin{" "}
          <strong>{selectedProductNextStatus.toLowerCase()}</strong> barang{" "}
          <strong>{selectedProduct?.name}</strong>?
        </p>
      </Modal>
    </>
  );
}

export default ProductListPage;