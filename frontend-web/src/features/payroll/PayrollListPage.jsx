import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  SearchCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { employeeApi } from "../employees/employee.api";
import {
  downloadPayrollBlobResponse,
  openPayrollPdfResponse,
  payrollApi,
} from "./payroll.api";

const initialForm = {
  employeeId: "",
  period: getCurrentMonthInput(),
  baseSalary: "",
  allowance: "",
  deduction: "",
  bonus: "",
  paymentMethod: "CASH",
  paidAt: getTodayInputDate(),
  note: "",
};

function PayrollListPage() {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    employeeId: "",
    period: getCurrentMonthInput(),
    paymentMethod: "",
    status: "",
  });

  const [form, setForm] = useState(initialForm);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState("");
  const [isOpeningSlip, setIsOpeningSlip] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const activeEmployees = useMemo(() => {
    return employees.filter((employee) => employee.status === "ACTIVE");
  }, [employees]);

  const activeCashBankAccounts = useMemo(() => {
    return cashBankAccounts.filter((account) => account.status === "ACTIVE");
  }, [cashBankAccounts]);

  const selectedEmployee = useMemo(() => {
    return activeEmployees.find((employee) => employee.id === form.employeeId);
  }, [activeEmployees, form.employeeId]);

  const effectiveCashBankAccount = useMemo(() => {
    return getDefaultCashBankAccount(activeCashBankAccounts, form.paymentMethod);
  }, [activeCashBankAccounts, form.paymentMethod]);

  const grossSalary = useMemo(() => {
    return (
      parseAmountInput(form.baseSalary) +
      parseAmountInput(form.allowance) +
      parseAmountInput(form.bonus)
    );
  }, [form.allowance, form.baseSalary, form.bonus]);

  const netSalary = useMemo(() => {
    return Math.max(grossSalary - parseAmountInput(form.deduction), 0);
  }, [form.deduction, grossSalary]);

  const payrollParams = useMemo(() => {
    const params = {};
    const period = parseMonthInput(filters.period);

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (filters.employeeId) {
      params.employeeId = filters.employeeId;
    }

    if (period.periodMonth && period.periodYear) {
      params.periodMonth = period.periodMonth;
      params.periodYear = period.periodYear;
    }

    if (filters.paymentMethod) {
      params.paymentMethod = filters.paymentMethod;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    return params;
  }, [
    debouncedSearch,
    filters.employeeId,
    filters.paymentMethod,
    filters.period,
    filters.status,
  ]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [payrollResponse, employeeResponse, cashBankResponse] =
        await Promise.all([
          payrollApi.getList(payrollParams),
          employeeApi.getList(),
          cashBankApi.getList(),
        ]);

      const payrollData = payrollResponse.data?.data || payrollResponse.data;
      const employeeData = employeeResponse.data?.data || employeeResponse.data;
      const cashBankData = cashBankResponse.data?.data || cashBankResponse.data;

      setPayrolls(
        Array.isArray(payrollData?.payrolls)
          ? payrollData.payrolls
          : Array.isArray(payrollData)
            ? payrollData
            : []
      );

      setEmployees(
        Array.isArray(employeeData?.employees)
          ? employeeData.employees
          : Array.isArray(employeeData)
            ? employeeData
            : []
      );

      setCashBankAccounts(
        Array.isArray(cashBankData?.cashBankAccounts)
          ? cashBankData.cashBankAccounts
          : Array.isArray(cashBankData)
            ? cashBankData
            : []
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPayrolls([]);
      setEmployees([]);
      setCashBankAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [payrollParams]);

  const fetchPayrollDetail = useCallback(async (id) => {
    const response = await payrollApi.getById(id);
    const responseData = response.data?.data || response.data;
    const payroll = responseData?.payroll || responseData;

    setSelectedPayroll(payroll || null);

    return payroll || null;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  const summary = useMemo(() => {
    return payrolls.reduce(
      (current, payroll) => {
        const net = Number(payroll.netSalary || 0);

        return {
          payrollCount: current.payrollCount + 1,
          totalGrossSalary:
            current.totalGrossSalary + Number(payroll.grossSalary || 0),
          totalDeduction:
            current.totalDeduction + Number(payroll.deduction || 0),
          totalNetSalary: current.totalNetSalary + net,
        };
      },
      {
        payrollCount: 0,
        totalGrossSalary: 0,
        totalDeduction: 0,
        totalNetSalary: 0,
      }
    );
  }, [payrolls]);

  const payrollPagination = usePagination(payrolls, {
    pageSize: 15,
    resetKey: `${debouncedSearch}|${filters.employeeId}|${filters.period}|${filters.paymentMethod}|${filters.status}`,
  });

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilter = () => {
    setSearchInput("");
    setFilters({
      employeeId: "",
      period: getCurrentMonthInput(),
      paymentMethod: "",
      status: "",
    });
  };

  const handleOpenCreateModal = () => {
    const firstEmployee = activeEmployees[0];

    setForm({
      ...initialForm,
      period: getCurrentMonthInput(),
      paidAt: getTodayInputDate(),
      employeeId: firstEmployee?.id || "",
      baseSalary: formatAmountInput(firstEmployee?.baseSalary || ""),
    });

    setErrorMessage("");
    setIsFormModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormModalOpen(false);
    setForm(initialForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "employeeId") {
        const employee = activeEmployees.find((item) => item.id === value);

        return {
          ...current,
          employeeId: value,
          baseSalary: formatAmountInput(employee?.baseSalary || ""),
        };
      }

      if (["baseSalary", "allowance", "deduction", "bonus"].includes(name)) {
        return {
          ...current,
          [name]: formatAmountInput(value),
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmitForm = (event) => {
    event.preventDefault();

    const selectedPeriod = parseMonthInput(form.period);
    const baseSalary = parseAmountInput(form.baseSalary);

    if (!form.employeeId) {
      setErrorMessage("Pilih karyawan terlebih dahulu.");
      return;
    }

    if (!selectedPeriod.periodMonth || !selectedPeriod.periodYear) {
      setErrorMessage("Periode payroll wajib dipilih.");
      return;
    }

    if (baseSalary <= 0) {
      setErrorMessage("Gaji pokok harus lebih dari 0.");
      return;
    }

    if (netSalary <= 0) {
      setErrorMessage("Gaji bersih harus lebih dari 0.");
      return;
    }

    if (!effectiveCashBankAccount?.id) {
      setErrorMessage("Akun kas/bank otomatis belum tersedia.");
      return;
    }

    setErrorMessage("");
    setIsCreateConfirmOpen(true);
  };

  const handleConfirmCreate = async () => {
    const selectedPeriod = parseMonthInput(form.period);

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await payrollApi.create({
        employeeId: form.employeeId,
        periodMonth: selectedPeriod.periodMonth,
        periodYear: selectedPeriod.periodYear,
        baseSalary: parseAmountInput(form.baseSalary),
        allowance: parseAmountInput(form.allowance),
        deduction: parseAmountInput(form.deduction),
        bonus: parseAmountInput(form.bonus),
        paymentMethod: form.paymentMethod,
        cashBankAccountId: effectiveCashBankAccount.id,
        paidAt: form.paidAt || undefined,
        note: form.note.trim() || undefined,
      });

      await fetchData();

      setIsCreateConfirmOpen(false);
      setIsFormModalOpen(false);
      setForm(initialForm);
      setIsSuccessModalOpen(true);
    } catch (error) {
      setIsCreateConfirmOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = useCallback(
    async (row, event) => {
      event?.preventDefault();
      event?.stopPropagation();

      setIsDetailModalOpen(true);
      setIsDetailLoading(true);
      setSelectedPayroll(null);
      setErrorMessage("");

      try {
        await fetchPayrollDetail(row.id);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [fetchPayrollDetail]
  );

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedPayroll(null);
  };

  const handleOpenSlipPdf = async (payrollId) => {
    setIsOpeningSlip(payrollId);
    setErrorMessage("");

    try {
      const response = await payrollApi.getSlipPdf(payrollId);
      openPayrollPdfResponse(response);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsOpeningSlip("");
    }
  };

  const handleExportReport = async (type) => {
    setIsExporting(type);
    setErrorMessage("");

    try {
      if (type === "excel") {
        const response = await payrollApi.exportReportExcel(payrollParams);
        downloadPayrollBlobResponse(response, "laporan-payroll.xlsx");
      }

      if (type === "pdf") {
        const response = await payrollApi.exportReportPdf(payrollParams);
        openPayrollPdfResponse(response);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsExporting("");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "paidAt",
        label: "Tanggal Bayar",
        width: "145px",
        align: "center",
        render: (row) => formatDate(row.paidAt),
      },
      {
        key: "payrollNumber",
        label: "No Payroll",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">{row.payrollNumber || "-"}</span>
        ),
      },
      {
        key: "employee",
        label: "Karyawan",
        width: "250px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.employee?.name || "-"}</strong>
            <span>{row.employee?.position || "-"}</span>
          </div>
        ),
      },
      {
        key: "period",
        label: "Periode",
        width: "150px",
        align: "center",
        render: (row) => (
          <strong>
            {getMonthName(row.periodMonth)} {row.periodYear}
          </strong>
        ),
      },
      {
        key: "paymentMethod",
        label: "Metode",
        width: "130px",
        align: "center",
        render: (row) => (
          <Badge tone={row.paymentMethod === "TRANSFER" ? "info" : "warning"}>
            {getPaymentMethodLabel(row.paymentMethod)}
          </Badge>
        ),
      },
      {
        key: "grossSalary",
        label: "Gaji Kotor",
        width: "160px",
        align: "center",
        render: (row) => formatCurrency(row.grossSalary || 0),
      },
      {
        key: "deduction",
        label: "Potongan",
        width: "150px",
        align: "center",
        render: (row) => formatCurrency(row.deduction || 0),
      },
      {
        key: "netSalary",
        label: "Gaji Bersih",
        width: "170px",
        align: "center",
        render: (row) => <strong>{formatCurrency(row.netSalary || 0)}</strong>,
      },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (row) => {
          const status = getPayrollStatusMeta(row.status);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "actions",
        label: "Aksi",
        width: "220px",
        align: "center",
        render: (row) => (
          <div className="cash-bank-table-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(event) => handleOpenDetail(row, event)}
            >
              <Eye size={14} />
              Detail
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="payroll-slip-icon-button"
              onClick={() => handleOpenSlipPdf(row.id)}
              disabled={isOpeningSlip === row.id}
              title="Buka slip gaji PDF"
            >
              <Printer size={15} />
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenDetail, isOpeningSlip]
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Payroll"
      description="Kelola pembayaran gaji karyawan, slip gaji, jurnal payroll, dan laporan payroll."
      actions={
        <>
          <Button
            variant="secondary"
            className="report-export-button report-export-button-pdf"
            onClick={() => handleExportReport("pdf")}
            disabled={Boolean(isExporting) || isLoading}
          >
            <FileText size={16} />
            {isExporting === "pdf" ? "Membuka PDF..." : "Export PDF"}
          </Button>

          <Button
            variant="secondary"
            className="report-export-button report-export-button-excel"
            onClick={() => handleExportReport("excel")}
            disabled={Boolean(isExporting) || isLoading}
          >
            <FileSpreadsheet size={16} />
            {isExporting === "excel" ? "Download..." : "Export Excel"}
          </Button>

          <Button variant="primary" onClick={handleOpenCreateModal}>
            <Plus size={17} />
            Tambah Payroll
          </Button>
        </>
      }
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari payroll, karyawan, jabatan, catatan..."
          />

          <input
            className="report-filter-select payroll-month-input"
            type="month"
            name="period"
            value={filters.period}
            onChange={handleFilterChange}
          />

          <select
            className="report-filter-select"
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
          >
            <option value="">Semua Karyawan</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <select
            className="report-filter-select"
            name="paymentMethod"
            value={filters.paymentMethod}
            onChange={handleFilterChange}
          >
            <option value="">Semua Metode</option>
            <option value="CASH">Tunai</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <select
            className="report-filter-select"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Semua Status</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCcw size={15} />
            Refresh
          </Button>

          <Button variant="secondary" size="sm" onClick={handleResetFilter}>
            Reset Filter
          </Button>
        </FilterBar>
      }
    >
      {errorMessage && !isFormModalOpen ? (
        <div className="page-error-alert">{errorMessage}</div>
      ) : null}

      <div className="cash-bank-summary-grid">
        <PayrollSummaryCard
          tone="count"
          icon={<SearchCheck size={20} />}
          label="Jumlah Payroll"
          value={summary.payrollCount}
          helper="Payroll sesuai filter"
        />

        <PayrollSummaryCard
          tone="bank"
          icon={<UserRound size={20} />}
          label="Gaji Kotor"
          value={formatCurrency(summary.totalGrossSalary)}
          helper="Total sebelum potongan"
        />

        <PayrollSummaryCard
          tone="total"
          icon={<Banknote size={20} />}
          label="Potongan"
          value={formatCurrency(summary.totalDeduction)}
          helper="Total deduction"
        />

        <PayrollSummaryCard
          tone="cash"
          icon={<WalletCards size={20} />}
          label="Gaji Bersih"
          value={formatCurrency(summary.totalNetSalary)}
          helper="Total dibayarkan"
        />
      </div>

      <Table
        className="cash-bank-list-table"
        columns={columns}
        data={payrollPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Payroll belum tersedia"
        emptyDescription="Belum ada data payroll yang cocok dengan filter saat ini."
      />

      <Pagination
        page={payrollPagination.currentPage}
        totalPages={payrollPagination.totalPages}
        totalItems={payrollPagination.totalItems}
        startItem={payrollPagination.startItem}
        endItem={payrollPagination.endItem}
        pageSize={payrollPagination.pageSize}
        onPageChange={payrollPagination.setCurrentPage}
      />

      {isFormModalOpen
        ? createPortal(
            <div className="cash-bank-modal-backdrop">
              <form
                className="cash-bank-form-modal payroll-form-modal"
                onSubmit={handleSubmitForm}
              >
                <div className="cash-bank-modal-header">
                  <div>
                    <span>Tambah Payroll</span>
                    <strong>{selectedEmployee?.name || "Payroll Karyawan"}</strong>
                    <p>
                      Gaji bersih otomatis dihitung dan pembayaran akan
                      mengurangi saldo kas/bank.
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseCreateModal}>
                    <X size={20} />
                  </button>
                </div>

                {errorMessage ? (
                  <div className="page-error-alert">{errorMessage}</div>
                ) : null}

                <div className="payroll-form-scroll">
                  <div className="cash-bank-form-grid">
                    <label className="is-full">
                      Karyawan
                      <select
                        name="employeeId"
                        value={form.employeeId}
                        onChange={handleFormChange}
                      >
                        <option value="">Pilih karyawan</option>
                        {activeEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} - {employee.position}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="is-full">
                      Periode Payroll
                      <input
                        type="month"
                        name="period"
                        value={form.period}
                        onChange={handleFormChange}
                      />
                    </label>

                    <label>
                      Gaji Pokok
                      <input
                        name="baseSalary"
                        value={form.baseSalary}
                        onChange={handleFormChange}
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </label>

                    <label>
                      Tunjangan
                      <input
                        name="allowance"
                        value={form.allowance}
                        onChange={handleFormChange}
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </label>

                    <label>
                      Bonus
                      <input
                        name="bonus"
                        value={form.bonus}
                        onChange={handleFormChange}
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </label>

                    <label>
                      Potongan
                      <input
                        name="deduction"
                        value={form.deduction}
                        onChange={handleFormChange}
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </label>

                    <label>
                      Metode Bayar
                      <select
                        name="paymentMethod"
                        value={form.paymentMethod}
                        onChange={handleFormChange}
                      >
                        <option value="CASH">Tunai</option>
                        <option value="TRANSFER">Transfer</option>
                      </select>
                    </label>

                    <label>
                      Tanggal Bayar
                      <input
                        type="date"
                        name="paidAt"
                        value={form.paidAt}
                        onChange={handleFormChange}
                      />
                    </label>

                    <label className="is-full">
                      Akun Kas/Bank
                      <input
                        value={getCashBankAccountLabel(effectiveCashBankAccount)}
                        readOnly
                      />
                    </label>

                    <div className="payroll-calculation-panel">
                      <div>
                        <span>Gaji Kotor</span>
                        <strong>{formatCurrency(grossSalary)}</strong>
                      </div>

                      <div>
                        <span>Potongan</span>
                        <strong>
                          {formatCurrency(parseAmountInput(form.deduction))}
                        </strong>
                      </div>

                      <div>
                        <span>Gaji Bersih</span>
                        <strong>{formatCurrency(netSalary)}</strong>
                      </div>
                    </div>

                    <label className="is-full">
                      Catatan
                      <textarea
                        name="note"
                        value={form.note}
                        onChange={handleFormChange}
                        placeholder="Catatan payroll..."
                        rows={4}
                      />
                    </label>
                  </div>
                </div>

                <div className="cash-bank-modal-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseCreateModal}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>

                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    <Save size={15} />
                    Simpan Payroll
                  </Button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {isCreateConfirmOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmitting ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses payroll...</h2>

                    <p>
                      Sistem sedang mencatat payroll, membuat jurnal, dan
                      mengurangi saldo kas/bank.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Yakin ingin membuat payroll?</h2>

                    <p>
                      Payroll akan tercatat sebagai gaji karyawan dan masuk ke
                      jurnal accounting.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>Karyawan</span>
                        <strong>{selectedEmployee?.name || "-"}</strong>
                      </div>

                      <div>
                        <span>Periode</span>
                        <strong>{formatMonthPeriod(form.period)}</strong>
                      </div>

                      <div>
                        <span>Gaji Bersih</span>
                        <strong>{formatCurrency(netSalary)}</strong>
                      </div>
                    </div>

                    <div className="return-confirm-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsCreateConfirmOpen(false)}
                        disabled={isSubmitting}
                      >
                        Tidak
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmCreate}
                        disabled={isSubmitting}
                      >
                        Ya, Simpan
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {isSuccessModalOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal return-success-modal">
                <div className="return-confirm-icon is-success">
                  <CheckCircle2 size={42} />
                </div>

                <h2>Payroll berhasil dibuat</h2>

                <p>
                  Payroll sudah tercatat, jurnal payroll dibuat, dan slip gaji
                  siap dicetak.
                </p>

                <div className="return-confirm-actions is-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsSuccessModalOpen(false)}
                  >
                    Selesai
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isDetailModalOpen
        ? createPortal(
            <div className="receivable-detail-backdrop">
              <div className="receivable-detail-modal journal-detail-modal">
                <div className="receivable-detail-header">
                  <div>
                    <span>Detail Payroll</span>
                    <strong>{selectedPayroll?.payrollNumber || "-"}</strong>
                    <p>
                      {selectedPayroll
                        ? `${selectedPayroll.employee?.name || "-"} • ${getMonthName(
                            selectedPayroll.periodMonth
                          )} ${selectedPayroll.periodYear}`
                        : "Memuat detail payroll..."}
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseDetail}>
                    <X size={20} />
                  </button>
                </div>

                {isDetailLoading ? (
                  <div className="return-empty-state">Memuat detail payroll...</div>
                ) : null}

                {!isDetailLoading && selectedPayroll ? (
                  <>
                    <div className="receivable-detail-summary">
                      <div>
                        <span>Karyawan</span>
                        <strong>{selectedPayroll.employee?.name || "-"}</strong>
                        <p>{selectedPayroll.employee?.position || "-"}</p>
                      </div>

                      <div>
                        <span>Gaji Pokok</span>
                        <strong>{formatCurrency(selectedPayroll.baseSalary)}</strong>
                      </div>

                      <div>
                        <span>Gaji Kotor</span>
                        <strong>{formatCurrency(selectedPayroll.grossSalary)}</strong>
                      </div>

                      <div>
                        <span>Potongan</span>
                        <strong>{formatCurrency(selectedPayroll.deduction)}</strong>
                      </div>

                      <div>
                        <span>Gaji Bersih</span>
                        <strong>{formatCurrency(selectedPayroll.netSalary)}</strong>
                      </div>
                    </div>

                    <div className="receivable-detail-section">
                      <div className="return-section-title">
                        <FileText size={18} />
                        <span>Informasi Pembayaran</span>
                      </div>

                      <div className="payroll-detail-grid">
                        <div>
                          <span>Metode</span>
                          <strong>
                            {getPaymentMethodLabel(selectedPayroll.paymentMethod)}
                          </strong>
                        </div>

                        <div>
                          <span>Kas/Bank</span>
                          <strong>
                            {selectedPayroll.cashBankAccount?.name || "-"}
                          </strong>
                        </div>

                        <div>
                          <span>Tanggal Bayar</span>
                          <strong>{formatDate(selectedPayroll.paidAt)}</strong>
                        </div>

                        <div>
                          <span>Status</span>
                          <strong>{selectedPayroll.status || "-"}</strong>
                        </div>

                        <div className="is-full">
                          <span>Catatan</span>
                          <strong>{selectedPayroll.note || "-"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="receivable-detail-footer">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCloseDetail}
                      >
                        Tutup
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleOpenSlipPdf(selectedPayroll.id)}
                        disabled={isOpeningSlip === selectedPayroll.id}
                      >
                        <Printer size={15} />
                        Cetak Slip Gaji
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

function PayrollSummaryCard({ tone = "neutral", icon, label, value, helper }) {
  return (
    <Card className={`cash-bank-summary-card cash-bank-summary-card-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function getPayrollStatusMeta(status) {
  const statuses = {
    POSTED: {
      label: "Posted",
      tone: "success",
    },
    CANCELLED: {
      label: "Cancelled",
      tone: "danger",
    },
  };

  return (
    statuses[status] || {
      label: status || "-",
      tone: "neutral",
    }
  );
}

function getPaymentMethodLabel(method) {
  const labels = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
  };

  return labels[method] || method || "-";
}

function getDefaultCashBankAccount(accounts, method = "CASH") {
  const normalizedMethod = String(method || "CASH").toUpperCase();

  const matchedByType = accounts.find((account) =>
    normalizedMethod === "TRANSFER"
      ? account.type === "BANK"
      : account.type === "CASH"
  );

  if (matchedByType) {
    return matchedByType;
  }

  const keywords =
    normalizedMethod === "TRANSFER"
      ? ["bank", "rekening", "bca", "bri", "bni", "mandiri", "transfer"]
      : ["kas", "cash", "tunai"];

  return (
    accounts.find((account) => {
      const searchableText = [
        account.name,
        account.bankName,
        account.accountNumber,
        account.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return keywords.some((keyword) => searchableText.includes(keyword));
    }) || accounts[0]
  );
}

function getCashBankAccountLabel(account) {
  if (!account) {
    return "Akun otomatis belum tersedia";
  }

  return account.name || account.bankName || account.accountNumber || "-";
}

function getMonthName(month) {
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return monthNames[Number(month) - 1] || "-";
}

function formatAmountInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function parseAmountInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const numberValue = Number(digits || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getTodayInputDate() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 10);
}

function getCurrentMonthInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function parseMonthInput(value) {
  const [year, month] = String(value || "").split("-");

  return {
    periodMonth: Number(month || 0),
    periodYear: Number(year || 0),
  };
}

function formatMonthPeriod(value) {
  const period = parseMonthInput(value);

  if (!period.periodMonth || !period.periodYear) {
    return "-";
  }

  return `${getMonthName(period.periodMonth)} ${period.periodYear}`;
}

export default PayrollListPage;