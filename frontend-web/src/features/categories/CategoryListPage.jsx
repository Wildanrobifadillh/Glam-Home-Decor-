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
import { getErrorMessage } from "../../utils/getErrorMessage";
import { categoryApi } from "./category.api";

const DEFAULT_PAGE_SIZE = 10;

function CategoryListPage() {
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formValues, setFormValues] = useState({
    name: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await categoryApi.getList({
        page,
        limit: DEFAULT_PAGE_SIZE,
        search: filters.search || undefined,
        status: filters.status || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.categories ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const pagination = responseData?.pagination || responseData?.meta || {};

      setCategories(Array.isArray(list) ? list : []);
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
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters.search, filters.status]);

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
    setFilters((currentFilters) => ({
      ...currentFilters,
      search: value,
    }));
  };

  const handleStatusChange = (event) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      status: event.target.value,
    }));
  };

  const handleResetFilter = () => {
    setPage(1);
    setFilters({
      search: "",
      status: "",
    });
  };

  const handleOpenCreateModal = () => {
    setFormMode("create");
    setSelectedCategory(null);
    setFormValues({
      name: "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((category) => {
    setFormMode("edit");
    setSelectedCategory(category);
    setFormValues({
      name: category.name || "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    if (isSubmittingForm) {
      return;
    }

    setIsFormModalOpen(false);
    setSelectedCategory(null);
    setFormError("");
  };

  const handleFormChange = (event) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmitCategory = async (event) => {
    event.preventDefault();

    const name = formValues.name.trim();

    if (!name) {
      setFormError("Nama kategori wajib diisi.");
      return;
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    try {
      if (formMode === "edit" && selectedCategory) {
        await categoryApi.update(selectedCategory.id, { name });
      } else {
        await categoryApi.create({ name });
      }

      setIsFormModalOpen(false);
      setSelectedCategory(null);
      setFormValues({
        name: "",
      });

      fetchCategories();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenStatusModal = useCallback((category) => {
    setSelectedCategory(category);
    setIsStatusModalOpen(true);
  }, []);

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) {
      return;
    }

    setSelectedCategory(null);
    setIsStatusModalOpen(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedCategory) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage("");

    try {
      if (selectedCategory.status === "ACTIVE") {
        await categoryApi.deactivate(selectedCategory.id);
      } else {
        await categoryApi.activate(selectedCategory.id);
      }

      setIsStatusModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Nama Kategori",
        render: (row) => (
          <div className="table-main-text">
            <strong>{row.name || "-"}</strong>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "160px",
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

  const selectedCategoryNextStatus =
    selectedCategory?.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan";

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Kategori"
        description="Kelola kategori barang untuk Glam Home Decor."
        actions={
          <Button onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Tambah Kategori
          </Button>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Cari kategori..."
            />

            <Select value={filters.status} onChange={handleStatusChange}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>

            <Button variant="secondary" size="sm" onClick={fetchCategories}>
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
          columns={columns}
          data={categories}
          isLoading={isLoading}
          emptyTitle="Kategori belum tersedia"
          emptyDescription="Belum ada kategori yang cocok dengan filter saat ini."
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
        title={formMode === "edit" ? "Edit Kategori" : "Tambah Kategori"}
        description={
          formMode === "edit"
            ? "Perbarui nama kategori barang."
            : "Tambahkan kategori baru untuk data barang."
        }
        onClose={handleCloseFormModal}
      >
        <form onSubmit={handleSubmitCategory}>
          <FormField
            label="Nama Kategori"
            required
            error={formError}
            helper="Contoh: Plafon, Wall Panel, Aksesoris, atau List Profil."
          >
            <Input
              name="name"
              value={formValues.name}
              onChange={handleFormChange}
              placeholder="Masukkan nama kategori"
              autoFocus
            />
          </FormField>

          <FormActions
            submitLabel={formMode === "edit" ? "Simpan Perubahan" : "Simpan"}
            isSubmitting={isSubmittingForm}
            onCancel={handleCloseFormModal}
          />
        </form>
      </Modal>

      <Modal
        open={isStatusModalOpen}
        title={`${selectedCategoryNextStatus} Kategori`}
        description="Perubahan status kategori akan mempengaruhi data yang tampil di sistem."
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
              variant={selectedCategory?.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus
                ? "Memproses..."
                : `${selectedCategoryNextStatus} Kategori`}
            </Button>
          </>
        }
      >
        <p className="modal-confirm-text">
          Apakah Anda yakin ingin{" "}
          <strong>{selectedCategoryNextStatus.toLowerCase()}</strong> kategori{" "}
          <strong>{selectedCategory?.name}</strong>?
        </p>
      </Modal>
    </>
  );
}

export default CategoryListPage;