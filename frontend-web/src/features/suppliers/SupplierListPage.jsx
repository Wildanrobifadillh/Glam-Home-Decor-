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
import Textarea from "../../components/ui/Textarea";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { BRAND } from "../../constants/brand";
import { supplierApi } from "./supplier.api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const DEFAULT_PAGE_SIZE = 10;

function SupplierListPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

 const [searchInput, setSearchInput] = useState("");

 const [filters, setFilters] = useState({
   status: "",
 });

const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formValues, setFormValues] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await supplierApi.getList({
        page,
        limit: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.suppliers ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const pagination = responseData?.pagination || responseData?.meta || {};

      setSuppliers(Array.isArray(list) ? list : []);
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
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchSuppliers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchSuppliers]);

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

    const handleResetFilter = () => {
    setPage(1);
    setSearchInput("");
    setFilters({
        status: "",
    });
    };

  const handleOpenCreateModal = () => {
    setFormMode("create");
    setSelectedSupplier(null);
    setFormValues({
      name: "",
      phone: "",
      address: "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((supplier) => {
    setFormMode("edit");
    setSelectedSupplier(supplier);
    setFormValues({
      name: supplier.name || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    if (isSubmittingForm) {
      return;
    }

    setIsFormModalOpen(false);
    setSelectedSupplier(null);
    setFormError("");
  };

  const handleFormChange = (event) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmitSupplier = async (event) => {
    event.preventDefault();

    const name = formValues.name.trim();
    const phone = formValues.phone.trim();
    const address = formValues.address.trim();

    if (!name) {
      setFormError("Nama supplier wajib diisi.");
      return;
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    const payload = {
      name,
      phone: phone || undefined,
      address: address || undefined,
    };

    try {
      if (formMode === "edit" && selectedSupplier) {
        await supplierApi.update(selectedSupplier.id, payload);
      } else {
        await supplierApi.create(payload);
      }

      setIsFormModalOpen(false);
      setSelectedSupplier(null);
      setFormValues({
        name: "",
        phone: "",
        address: "",
      });

      fetchSuppliers();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenStatusModal = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setIsStatusModalOpen(true);
  }, []);

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) {
      return;
    }

    setSelectedSupplier(null);
    setIsStatusModalOpen(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedSupplier) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage("");

    try {
      if (selectedSupplier.status === "ACTIVE") {
        await supplierApi.deactivate(selectedSupplier.id);
      } else {
        await supplierApi.activate(selectedSupplier.id);
      }

      setIsStatusModalOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers();
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
        label: "Nama Supplier",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.name || "-"}</strong>
          </div>
        ),
      },
      {
        key: "phone",
        label: "Telepon",
        width: "170px",
        align: "center",
        render: (row) => row.phone || "-",
      },
      {
        key: "address",
        label: "Alamat",
        align: "center",
        render: (row) => (
          <span className="table-address-text" title={row.address || ""}>
            {row.address || "-"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "150px",
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

  const selectedSupplierNextStatus =
    selectedSupplier?.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan";

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Supplier"
        description={`Kelola data supplier untuk pembelian barang ${BRAND.name}.`}
        actions={
          <Button onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Tambah Supplier
          </Button>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Cari supplier..."
            />

            <Select value={filters.status} onChange={handleStatusChange}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>

            <Button variant="secondary" size="sm" onClick={fetchSuppliers}>
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
          data={suppliers}
          isLoading={isLoading}
          emptyTitle="Supplier belum tersedia"
          emptyDescription="Belum ada supplier yang cocok dengan filter saat ini."
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
        title={formMode === "edit" ? "Edit Supplier" : "Tambah Supplier"}
        description={
          formMode === "edit"
            ? "Perbarui data supplier."
            : "Tambahkan supplier baru untuk transaksi pembelian."
        }
        onClose={handleCloseFormModal}
      >
        <form onSubmit={handleSubmitSupplier}>
          <div className="form-grid">
            <FormField
              label="Nama Supplier"
              required
              error={formError}
              className="form-grid-full"
            >
              <Input
                name="name"
                value={formValues.name}
                onChange={handleFormChange}
                placeholder="Masukkan nama supplier"
                autoFocus
              />
            </FormField>

            <FormField label="Telepon" helper="Opsional. Contoh: 08123456789">
              <Input
                name="phone"
                value={formValues.phone}
                onChange={handleFormChange}
                placeholder="Masukkan nomor telepon"
              />
            </FormField>

            <FormField label="Alamat" helper="Opsional." className="form-grid-full">
              <Textarea
                name="address"
                value={formValues.address}
                onChange={handleFormChange}
                placeholder="Masukkan alamat supplier"
              />
            </FormField>
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
        title={`${selectedSupplierNextStatus} Supplier`}
        description="Perubahan status supplier akan mempengaruhi data yang tampil di sistem."
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
              variant={selectedSupplier?.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus
                ? "Memproses..."
                : `${selectedSupplierNextStatus} Supplier`}
            </Button>
          </>
        }
      >
        <p className="modal-confirm-text">
          Apakah Anda yakin ingin{" "}
          <strong>{selectedSupplierNextStatus.toLowerCase()}</strong> supplier{" "}
          <strong>{selectedSupplier?.name}</strong>?
        </p>
      </Modal>
    </>
  );
}

export default SupplierListPage;