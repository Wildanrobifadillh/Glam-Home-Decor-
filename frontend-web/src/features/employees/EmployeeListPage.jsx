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
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { employeeApi } from "./employee.api";
import CurrencyInput from "../../components/form/CurrencyInput";

const DEFAULT_PAGE_SIZE = 10;

const emptyFormValues = {
  name: "",
  phone: "",
  address: "",
  position: "",
  baseSalary: "",
  joinedAt: "",
};

function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
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

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await employeeApi.getList({
        page,
        limit: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
      });

      const responseData = response.data?.data || response.data;

      const list =
        responseData?.employees ||
        responseData?.items ||
        responseData?.data ||
        responseData ||
        [];

      const pagination = responseData?.pagination || responseData?.meta || {};

      setEmployees(Array.isArray(list) ? list : []);
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
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchEmployees();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchEmployees]);

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
    setSelectedEmployee(null);
    setFormValues(emptyFormValues);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = useCallback((employee) => {
    setFormMode("edit");
    setSelectedEmployee(employee);
    setFormValues({
      name: employee.name || "",
      phone: employee.phone || "",
      address: employee.address || "",
      position: employee.position || "",
      baseSalary: String(employee.baseSalary ?? ""),
      joinedAt: toDateInputValue(employee.joinedAt),
    });
    setFormError("");
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = () => {
    if (isSubmittingForm) {
      return;
    }

    setIsFormModalOpen(false);
    setSelectedEmployee(null);
    setFormError("");
  };

  const handleFormChange = (event) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmitEmployee = async (event) => {
    event.preventDefault();

    const name = formValues.name.trim();
    const phone = formValues.phone.trim();
    const address = formValues.address.trim();
    const position = formValues.position.trim();
    const baseSalary = Number(formValues.baseSalary || 0);

    if (!name) {
      setFormError("Nama karyawan wajib diisi.");
      return;
    }

    if (!position) {
      setFormError("Jabatan wajib diisi.");
      return;
    }

    if (baseSalary < 0) {
      setFormError("Gaji pokok tidak boleh bernilai negatif.");
      return;
    }

    setIsSubmittingForm(true);
    setFormError("");
    setErrorMessage("");

    const payload = {
      name,
      phone: phone || undefined,
      address: address || undefined,
      position,
      baseSalary,
      joinedAt: formValues.joinedAt || undefined,
    };

    try {
      if (formMode === "edit" && selectedEmployee) {
        await employeeApi.update(selectedEmployee.id, payload);
      } else {
        await employeeApi.create(payload);
      }

      setIsFormModalOpen(false);
      setSelectedEmployee(null);
      setFormValues(emptyFormValues);

      fetchEmployees();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleOpenStatusModal = useCallback((employee) => {
    setSelectedEmployee(employee);
    setIsStatusModalOpen(true);
  }, []);

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) {
      return;
    }

    setSelectedEmployee(null);
    setIsStatusModalOpen(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedEmployee) {
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage("");

    try {
      if (selectedEmployee.status === "ACTIVE") {
        await employeeApi.deactivate(selectedEmployee.id);
      } else {
        await employeeApi.activate(selectedEmployee.id);
      }

      setIsStatusModalOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
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
        label: "Nama Karyawan",
        width: "220px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center employee-name-cell">
            <strong>{row.name || "-"}</strong>
          </div>
        ),
      },
      {
        key: "position",
        label: "Jabatan",
        width: "160px",
        align: "center",
        render: (row) => row.position || "-",
      },
      {
        key: "phone",
        label: "Telepon",
        width: "160px",
        align: "center",
        render: (row) => row.phone || "-",
      },
      {
        key: "baseSalary",
        label: "Gaji Pokok",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.baseSalary),
      },
      {
        key: "joinedAt",
        label: "Tanggal Masuk",
        width: "170px",
        align: "center",
        render: (row) => formatDate(row.joinedAt),
      },
      {
        key: "user",
        label: "Akun User",
        width: "170px",
        align: "center",
        render: (row) =>
          row.user ? (
            <div className="employee-user-cell">
              <strong>{row.user.username || row.user.name}</strong>
              <span>{getRoleLabel(row.user.role)}</span>
            </div>
          ) : (
            <Badge tone="neutral">Belum Ada</Badge>
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

  const selectedEmployeeNextStatus =
    selectedEmployee?.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan";

  return (
    <>
      <ListPageLayout
        eyebrow=""
        title="Karyawan"
        description="Kelola data karyawan, jabatan, gaji pokok, dan status aktif."
        actions={
          <Button onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Tambah Karyawan
          </Button>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Cari nama, jabatan, atau telepon..."
            />

            <Select value={filters.status} onChange={handleStatusChange}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>

            <Button variant="secondary" size="sm" onClick={fetchEmployees}>
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
          className="employee-table"
          columns={columns}
          data={employees}
          isLoading={isLoading}
          emptyTitle="Karyawan belum tersedia"
          emptyDescription="Belum ada karyawan yang cocok dengan filter saat ini."
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
        className="employee-form-modal"
        title={formMode === "edit" ? "Edit Karyawan" : "Tambah Karyawan"}
        description={
          formMode === "edit"
            ? "Perbarui data karyawan."
            : "Tambahkan karyawan baru ke master data."
        }
        onClose={handleCloseFormModal}
      >
        <form onSubmit={handleSubmitEmployee}>
          {formError ? <div className="form-error-alert">{formError}</div> : null}

          <div className="form-grid">
            <FormField label="Nama Karyawan" required>
              <Input
                name="name"
                value={formValues.name}
                onChange={handleFormChange}
                placeholder="Masukkan nama karyawan"
                autoFocus
              />
            </FormField>

            <FormField label="Jabatan" required>
              <Input
                name="position"
                value={formValues.position}
                onChange={handleFormChange}
                placeholder="Contoh: Admin, Gudang, Kasir"
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

            <FormField label="Gaji Pokok">
            <CurrencyInput
                name="baseSalary"
                value={formValues.baseSalary}
                onChange={handleFormChange}
                placeholder="0"
                />
            </FormField>

            <FormField label="Tanggal Masuk">
              <Input
                type="date"
                name="joinedAt"
                value={formValues.joinedAt}
                onChange={handleFormChange}
              />
            </FormField>

            <FormField label="Alamat" helper="Opsional." className="form-grid-full">
              <Textarea
                name="address"
                value={formValues.address}
                onChange={handleFormChange}
                placeholder="Masukkan alamat karyawan"
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
        title={`${selectedEmployeeNextStatus} Karyawan`}
        description="Perubahan status karyawan akan mempengaruhi data yang tampil di sistem."
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
              variant={selectedEmployee?.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus
                ? "Memproses..."
                : `${selectedEmployeeNextStatus} Karyawan`}
            </Button>
          </>
        }
      >
        <p className="modal-confirm-text">
          Apakah Anda yakin ingin{" "}
          <strong>{selectedEmployeeNextStatus.toLowerCase()}</strong> karyawan{" "}
          <strong>{selectedEmployee?.name}</strong>?
        </p>
      </Modal>
    </>
  );
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getRoleLabel(role) {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN_STAFF") return "Admin Staff";
  if (role === "STAFF_GUDANG") return "Staff Gudang";

  return role || "-";
}

export default EmployeeListPage;