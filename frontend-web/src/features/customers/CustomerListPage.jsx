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
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { customerApi } from "./customer.api";

const DEFAULT_PAGE_SIZE = 10;

const emptyFormValues = {
  name: "",
  phone: "",
  type: "GENERAL",
  address: "",
};

function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    type: "",
  });

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await customerApi.getList({
        page,
        limit: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.customers ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const pagination = responseData?.pagination || responseData?.meta || {};

      setCustomers(Array.isArray(list) ? list : []);
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
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.status, filters.type]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchCustomers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchCustomers]);

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

  const handleTypeChange = (event) => {
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      type: event.target.value,
    }));
  };

  const handleResetFilter = () => {
    setPage(1);
    setSearchInput("");
    setFilters({
      status: "",
      type: "",
    });
  };

  const handleOpenCreateModal = () => {
    setFormMode("create");
    setSelectedCustomer(null);
    setFormValues(emptyFormValues);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((customer) => {
    setFormMode("edit");
    setSelectedCustomer(customer);
    setFormValues({
      name: customer.name || "",
      phone: customer.phone || "",
      type: customer.type || "GENERAL",
      address: customer.address || "",
    });
    setFormError("");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    if (isSubmittingForm) {
      return;
    }

    setIsFormModalOpen(false);
    setSelectedCustomer(null);
    setFormError("");
  };

  const handleFormChange = (event) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmitCustomer = async (event) => {
    event.preventDefault();

    const name = formValues.name.trim();
    const phone = formValues.phone.trim();
    const address = formValues.address.trim();

    if (!name) {
      setFormError("Nama pelanggan wajib diisi.");
      return;
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    const payload = {
      name,
      phone: phone || undefined,
      address: address || undefined,
      type: formValues.type || "GENERAL",
    };

    try {
      if (formMode === "edit" && selectedCustomer) {
        await customerApi.update(selectedCustomer.id, payload);
      } else {
        await customerApi.create(payload);
      }

      setIsFormModalOpen(false);
      setSelectedCustomer(null);
      setFormValues(emptyFormValues);

      fetchCustomers();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenStatusModal = useCallback((customer) => {
    setSelectedCustomer(customer);
    setIsStatusModalOpen(true);
  }, []);

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) {
      return;
    }

    setSelectedCustomer(null);
    setIsStatusModalOpen(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedCustomer) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage("");

    try {
      if (selectedCustomer.status === "ACTIVE") {
        await customerApi.deactivate(selectedCustomer.id);
      } else {
        await customerApi.activate(selectedCustomer.id);
      }

      setIsStatusModalOpen(false);
      setSelectedCustomer(null);
      fetchCustomers();
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
        label: "Nama Pelanggan",
        width: "240px",
        align: "center",
        render: (row) => (
            <div className="table-main-text is-center customer-name-cell">
            <strong>{row.name || "-"}</strong>
            </div>
        ),
        },
        {
        key: "phone",
        label: "Telepon",
        width: "180px",
        align: "center",
        render: (row) => row.phone || "-",
        },
        {
        key: "type",
        label: "Tipe",
        width: "150px",
        align: "center",
        render: (row) => (
            <Badge tone={getCustomerTypeTone(row.type)}>
            {getCustomerTypeLabel(row.type)}
            </Badge>
        ),
        },
        {
        key: "address",
        label: "Alamat",
        width: "280px",
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

  const selectedCustomerNextStatus =
    selectedCustomer?.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan";

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Pelanggan"
        description="Kelola data pelanggan untuk penjualan, invoice, dan piutang."
        actions={
          <Button onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Tambah Pelanggan
          </Button>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Cari pelanggan..."
            />

            <Select value={filters.type} onChange={handleTypeChange}>
              <option value="">Semua Tipe</option>
              <option value="GENERAL">Umum</option>
              <option value="PROJECT">Project</option>
              <option value="RESELLER">Reseller</option>
            </Select>

            <Select value={filters.status} onChange={handleStatusChange}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>

            <Button variant="secondary" size="sm" onClick={fetchCustomers}>
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
            className="customer-table"
            columns={columns}
            data={customers}
            isLoading={isLoading}
            emptyTitle="Pelanggan belum tersedia"
            emptyDescription="Belum ada pelanggan yang cocok dengan filter saat ini."
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
        className="customer-form-modal"
        title={formMode === "edit" ? "Edit Pelanggan" : "Tambah Pelanggan"}
        description={
          formMode === "edit"
            ? "Perbarui data pelanggan."
            : "Tambahkan pelanggan baru untuk transaksi penjualan."
        }
        onClose={handleCloseFormModal}
      >
        <form onSubmit={handleSubmitCustomer}>
          {formError ? <div className="form-error-alert">{formError}</div> : null}

          <div className="form-grid">
            <FormField label="Nama Pelanggan" required className="form-grid-full">
              <Input
                name="name"
                value={formValues.name}
                onChange={handleFormChange}
                placeholder="Masukkan nama pelanggan"
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

            <FormField label="Tipe Pelanggan" required>
              <Select
                name="type"
                value={formValues.type}
                onChange={handleFormChange}
              >
                <option value="GENERAL">Umum</option>
                <option value="PROJECT">Project</option>
                <option value="RESELLER">Reseller</option>
              </Select>
            </FormField>

            <FormField label="Alamat" helper="Opsional." className="form-grid-full">
              <Textarea
                name="address"
                value={formValues.address}
                onChange={handleFormChange}
                placeholder="Masukkan alamat pelanggan"
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
        title={`${selectedCustomerNextStatus} Pelanggan`}
        description="Perubahan status pelanggan akan mempengaruhi data yang tampil di sistem."
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
              variant={selectedCustomer?.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus
                ? "Memproses..."
                : `${selectedCustomerNextStatus} Pelanggan`}
            </Button>
          </>
        }
      >
        <p className="modal-confirm-text">
          Apakah Anda yakin ingin{" "}
          <strong>{selectedCustomerNextStatus.toLowerCase()}</strong> pelanggan{" "}
          <strong>{selectedCustomer?.name}</strong>?
        </p>
      </Modal>
    </>
  );
}

function getCustomerTypeLabel(type) {
  if (type === "PROJECT") return "Project";
  if (type === "RESELLER") return "Reseller";

  return "Umum";
}

function getCustomerTypeTone(type) {
  if (type === "PROJECT") return "warning";
  if (type === "RESELLER") return "success";

  return "neutral";
}

export default CustomerListPage;