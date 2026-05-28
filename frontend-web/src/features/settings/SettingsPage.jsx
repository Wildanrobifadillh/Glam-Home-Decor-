import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Save,
  Settings2,
  UsersRound,
  ShieldCheck,
  Star,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import FilterBar from "../../components/form/FilterBar";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { accountApi } from "../accounting/account.api";
import { cashBankApi } from "../cash-bank/cashBank.api";
import { settingsApi } from "./settings.api";

const tabs = [
  {
    key: "profile",
    label: "Profil Toko",
    icon: Building2,
  },
  {
    key: "bank",
    label: "Bank Invoice",
    icon: CreditCard,
  },
  {
    key: "operational",
    label: "Operasional",
    icon: Settings2,
  },
    {
    key: "document",
    label: "Dokumen & PDF",
    icon: FileText,
    },
    {
    key: "permissions",
    label: "Hak Akses",
    icon: UsersRound,
    },
    {
    key: "users",
    label: "User & Password",
    icon: UserPlus,
    },
];

const initialStoreProfile = {
  name: "",
  legalName: "",
  brandShortName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  socialMedia: "",
  logoUrl: "",
  taxNumber: "",
  businessNumber: "",
};

const initialOperationalPreferences = {
  defaultReceivableDueDays: 7,
  defaultPayableDueDays: 14,
  defaultPaymentMethod: "CASH",
  defaultCashBankAccountId: "",
  requireReceivableApproval: true,
};

const initialDocumentSetting = {
  documentLanguage: "ID",
  salesInvoicePrefix: "INV",
  salesReturnPrefix: "SR",
  purchaseReturnPrefix: "PR",
  payrollSlipPrefix: "PAY",
  reportPrefix: "RPT",
  deliveryOrderPrefix: "",
  resetNumberMonthly: true,
  defaultPaperSize: "F4",
  alternatePaperSize: "A4",
  invoiceCopies: 3,
  maxItemsF4: 12,
  maxItemsA4: 8,
  copyLabel1: "Customer",
  copyLabel2: "Accounting",
  copyLabel3: "Archive",
  thankYouNote: "",
  transactionProofNote: "",
  complaintTerms: "",
  returnTerms: "",
  paymentTerms: "",
  additionalNote: "",
  responsiblePersonName: "",
  responsiblePersonTitle: "",
  showSignature: true,
  signatureUrl: "",
  showStamp: true,
  stampUrl: "",
  signatureText: "",
};

const initialBankForm = {
  accountId: "",
  name: "",
  bankName: "",
  accountNumber: "",
  accountHolderName: "",
  isDefaultForInvoice: false,
};

const initialUserForm = {
  name: "",
  username: "",
  password: "",
  role: "ADMIN_STAFF",
};

const initialResetPasswordForm = {
  password: "",
};

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const [storeProfile, setStoreProfile] = useState(initialStoreProfile);
  const [operationalPreferences, setOperationalPreferences] = useState(
    initialOperationalPreferences
  );
  const [documentSetting, setDocumentSetting] = useState(initialDocumentSetting);
  const [storeBankAccounts, setStoreBankAccounts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);

  const [modules, setModules] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [selectedPermissionRole, setSelectedPermissionRole] =
    useState("ADMIN_STAFF");
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [resetPasswordForm, setResetPasswordForm] = useState(
    initialResetPasswordForm
    );
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);

  const [bankForm, setBankForm] = useState(initialBankForm);
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const assetAccounts = useMemo(() => {
    return accounts.filter(
      (account) => account.status === "ACTIVE" && account.type === "ASSET"
    );
  }, [accounts]);

  const activeCashBankAccounts = useMemo(() => {
        return cashBankAccounts.filter((account) => account.status === "ACTIVE");
    }, [cashBankAccounts]);

    const selectedPermissionData = useMemo(() => {
    return rolePermissions.find(
        (permission) => permission.role === selectedPermissionRole
    );
    }, [rolePermissions, selectedPermissionRole]);

    const selectedModuleKeys = useMemo(() => {
    return new Set(
        selectedPermissionData?.permissions
        ?.filter((permission) => permission.canAccess)
        .map((permission) => permission.key) || []
    );
    }, [selectedPermissionData]);

    const groupedModules = useMemo(() => {
    return modules.reduce((groups, moduleItem) => {
        const groupName = moduleItem.group || "Lainnya";

        if (!groups[groupName]) {
        groups[groupName] = [];
        }

        groups[groupName].push(moduleItem);

        return groups;
    }, {});
    }, [modules]);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        storeProfileResponse,
        bankAccountsResponse,
        operationalResponse,
        documentResponse,
        accountResponse,
        cashBankResponse,
        modulesResponse,
        rolePermissionsResponse,
        usersResponse,
        ] = await Promise.all([
        settingsApi.getStoreProfile(),
        settingsApi.getStoreBankAccounts(),
        settingsApi.getOperationalPreferences(),
        settingsApi.getDocumentSetting(),
        accountApi.getList(),
        cashBankApi.getList(),
        settingsApi.getModules(),
        settingsApi.getAllRolePermissions(),
        settingsApi.getUsers(),
        ]);

      const storeProfileData =
        storeProfileResponse.data?.data?.storeProfile ||
        storeProfileResponse.data?.storeProfile ||
        storeProfileResponse.data?.data ||
        null;

      const bankAccountsData =
        bankAccountsResponse.data?.data?.storeBankAccounts ||
        bankAccountsResponse.data?.storeBankAccounts ||
        bankAccountsResponse.data?.data ||
        [];

      const operationalData =
        operationalResponse.data?.data?.operationalPreferences ||
        operationalResponse.data?.operationalPreferences ||
        operationalResponse.data?.data ||
        null;

      const documentData =
        documentResponse.data?.data?.documentSetting ||
        documentResponse.data?.documentSetting ||
        documentResponse.data?.data ||
        null;

      const accountData =
        accountResponse.data?.data?.accounts ||
        accountResponse.data?.accounts ||
        accountResponse.data?.data ||
        [];

      const cashBankData =
        cashBankResponse.data?.data?.cashBankAccounts ||
        cashBankResponse.data?.cashBankAccounts ||
        cashBankResponse.data?.data ||
        [];

      const modulesData =
        modulesResponse.data?.data?.modules ||
        modulesResponse.data?.modules ||
        modulesResponse.data?.data ||
        [];

        const rolePermissionsData =
        rolePermissionsResponse.data?.data?.roles ||
        rolePermissionsResponse.data?.roles ||
        rolePermissionsResponse.data?.data?.roles ||
        [];
        
        const usersData =
        usersResponse.data?.data?.users ||
        usersResponse.data?.users ||
        usersResponse.data?.data ||
        [];

      setStoreProfile({
        ...initialStoreProfile,
        ...(storeProfileData || {}),
      });

      setStoreBankAccounts(Array.isArray(bankAccountsData) ? bankAccountsData : []);

      setOperationalPreferences({
        ...initialOperationalPreferences,
        ...(operationalData || {}),
        defaultCashBankAccountId:
          operationalData?.defaultCashBankAccountId || "",
      });

      setDocumentSetting({
        ...initialDocumentSetting,
        ...(documentData || {}),
      });

      setAccounts(Array.isArray(accountData) ? accountData : []);
      setCashBankAccounts(Array.isArray(cashBankData) ? cashBankData : []);
      setModules(Array.isArray(modulesData) ? modulesData : []);
        setRolePermissions(
        Array.isArray(rolePermissionsData) ? rolePermissionsData : []
        );
        setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchSettings();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchSettings]);

  const handleStoreProfileChange = (event) => {
    const { name, value } = event.target;

    setStoreProfile((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleOperationalChange = (event) => {
    const { name, type, checked, value } = event.target;

    setOperationalPreferences((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDocumentChange = (event) => {
    const { name, type, checked, value } = event.target;

    setDocumentSetting((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBankFormChange = (event) => {
    const { name, type, checked, value } = event.target;

    setBankForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTogglePermission = (moduleKey) => {
    setRolePermissions((current) =>
        current.map((rolePermission) => {
        if (rolePermission.role !== selectedPermissionRole) {
            return rolePermission;
        }

        return {
            ...rolePermission,
            permissions: rolePermission.permissions.map((permission) =>
            permission.key === moduleKey
                ? {
                    ...permission,
                    canAccess: !permission.canAccess,
                }
                : permission
            ),
        };
        })
    );
    };

    const handleSaveRolePermissions = () => {
    setConfirmConfig({
        title: "Simpan hak akses role?",
        description:
        "Akses menu untuk role ini akan diperbarui. OWNER tetap memiliki akses penuh.",
        confirmLabel: "Ya, Simpan",
        action: async () => {
        const moduleKeys =
            selectedPermissionData?.permissions
            ?.filter((permission) => permission.canAccess)
            .map((permission) => permission.key) || [];

        const response = await settingsApi.updateRolePermissions(
            selectedPermissionRole,
            moduleKeys
        );

        const updated =
            response.data?.data?.rolePermissions ||
            response.data?.rolePermissions ||
            response.data?.data;

        setRolePermissions((current) =>
            current.map((rolePermission) =>
            rolePermission.role === selectedPermissionRole
                ? updated
                : rolePermission
            )
        );

        setSuccessMessage("Hak akses role berhasil disimpan.");
        },
    });
    };

    const handleUserFormChange = (event) => {
  const { name, value } = event.target;

  setUserForm((current) => ({
    ...current,
    [name]: value,
  }));
};

const handleOpenCreateUser = () => {
  setSelectedUser(null);
  setUserForm(initialUserForm);
  setErrorMessage("");
  setIsUserModalOpen(true);
};

const handleOpenEditUser = (row) => {
  setSelectedUser(row);
  setUserForm({
    name: row.name || "",
    username: row.username || "",
    password: "",
    role: row.role || "ADMIN_STAFF",
  });
  setErrorMessage("");
  setIsUserModalOpen(true);
};

const handleCloseUserModal = () => {
  if (isSubmitting) {
    return;
  }

  setIsUserModalOpen(false);
  setSelectedUser(null);
  setUserForm(initialUserForm);
};

const handleSubmitUser = (event) => {
  event.preventDefault();

  const name = userForm.name.trim();
  const username = userForm.username.trim();
  const password = userForm.password.trim();

  if (!name) {
    setErrorMessage("Nama user wajib diisi.");
    return;
  }

  if (username.length < 3) {
    setErrorMessage("Username minimal 3 karakter.");
    return;
  }

  if (!selectedUser && password.length < 6) {
    setErrorMessage("Password minimal 6 karakter.");
    return;
  }

  setErrorMessage("");

  setConfirmConfig({
    title: selectedUser ? "Simpan perubahan user?" : "Tambah user baru?",
    description: selectedUser
      ? "Nama, username, dan role user akan diperbarui."
      : "User baru akan dibuat dan bisa login ke sistem.",
    confirmLabel: selectedUser ? "Ya, Simpan" : "Ya, Tambah",
    action: async () => {
      if (selectedUser) {
        await settingsApi.updateUser(selectedUser.id, {
          name,
          username,
        });

        if (selectedUser.role !== userForm.role) {
          await settingsApi.updateUserRole(selectedUser.id, userForm.role);
        }

        setSuccessMessage("User berhasil diperbarui.");
      } else {
        await settingsApi.createUser({
          name,
          username,
          password,
          role: userForm.role,
        });

        setSuccessMessage("User berhasil ditambahkan.");
      }

      await fetchSettings();
      setIsUserModalOpen(false);
      setSelectedUser(null);
      setUserForm(initialUserForm);
    },
  });
};

const handleToggleUserStatus = (row) => {
  const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  setConfirmConfig({
    title: nextStatus === "ACTIVE" ? "Aktifkan user?" : "Nonaktifkan user?",
    description:
      nextStatus === "ACTIVE"
        ? "User akan bisa login kembali ke sistem."
        : "User tidak akan bisa login ke sistem.",
    confirmLabel: nextStatus === "ACTIVE" ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
    action: async () => {
      await settingsApi.updateUserStatus(row.id, nextStatus);
      await fetchSettings();

      setSuccessMessage(
        nextStatus === "ACTIVE"
          ? "User berhasil diaktifkan."
          : "User berhasil dinonaktifkan."
      );
    },
  });
};

const handleOpenResetPassword = (row) => {
  setSelectedUser(row);
  setResetPasswordForm(initialResetPasswordForm);
  setErrorMessage("");
  setIsResetPasswordModalOpen(true);
};

const handleCloseResetPasswordModal = () => {
  if (isSubmitting) {
    return;
  }

  setIsResetPasswordModalOpen(false);
  setSelectedUser(null);
  setResetPasswordForm(initialResetPasswordForm);
};

const handleResetPasswordFormChange = (event) => {
  const { name, value } = event.target;

  setResetPasswordForm((current) => ({
    ...current,
    [name]: value,
  }));
};

const handleSubmitResetPassword = (event) => {
  event.preventDefault();

  const password = resetPasswordForm.password.trim();

  if (password.length < 6) {
    setErrorMessage("Password baru minimal 6 karakter.");
    return;
  }

  setErrorMessage("");

  setConfirmConfig({
    title: "Reset password user?",
    description: `Password untuk ${selectedUser?.name || "user"} akan diganti.`,
    confirmLabel: "Ya, Reset",
    action: async () => {
      await settingsApi.resetUserPassword(selectedUser.id, password);
      await fetchSettings();

      setIsResetPasswordModalOpen(false);
      setSelectedUser(null);
      setResetPasswordForm(initialResetPasswordForm);
      setSuccessMessage("Password user berhasil direset.");
    },
  });
};

  const handleSaveStoreProfile = () => {
    setConfirmConfig({
      title: "Simpan profil toko?",
      description:
        "Data profil toko akan digunakan untuk invoice, slip gaji, dan dokumen resmi.",
      confirmLabel: "Ya, Simpan",
      action: async () => {
        const payload = sanitizePayload(storeProfile);
        const response = await settingsApi.updateStoreProfile(payload);
        const updated =
          response.data?.data?.storeProfile ||
          response.data?.storeProfile ||
          response.data?.data;

        setStoreProfile({
          ...initialStoreProfile,
          ...(updated || payload),
        });

        setSuccessMessage("Profil toko berhasil disimpan.");
      },
    });
  };

  const handleSaveOperational = () => {
    setConfirmConfig({
      title: "Simpan preferensi operasional?",
      description:
        "Default transaksi seperti due date, metode bayar, dan akun kas/bank akan diperbarui.",
      confirmLabel: "Ya, Simpan",
      action: async () => {
        const payload = {
          defaultReceivableDueDays: Number(
            operationalPreferences.defaultReceivableDueDays || 0
          ),
          defaultPayableDueDays: Number(
            operationalPreferences.defaultPayableDueDays || 0
          ),
          defaultPaymentMethod: operationalPreferences.defaultPaymentMethod,
          defaultCashBankAccountId:
            operationalPreferences.defaultCashBankAccountId || null,
          requireReceivableApproval:
            Boolean(operationalPreferences.requireReceivableApproval),
        };

        const response = await settingsApi.updateOperationalPreferences(payload);
        const updated =
          response.data?.data?.operationalPreferences ||
          response.data?.operationalPreferences ||
          response.data?.data;

        setOperationalPreferences({
          ...initialOperationalPreferences,
          ...(updated || payload),
          defaultCashBankAccountId:
            updated?.defaultCashBankAccountId ||
            payload.defaultCashBankAccountId ||
            "",
        });

        setSuccessMessage("Preferensi operasional berhasil disimpan.");
      },
    });
  };

  const handleSaveDocument = () => {
    setConfirmConfig({
      title: "Simpan pengaturan dokumen?",
      description:
        "Prefix, ukuran kertas, catatan invoice, dan penanggung jawab dokumen akan diperbarui.",
      confirmLabel: "Ya, Simpan",
      action: async () => {
        const payload = {
          ...sanitizePayload(documentSetting),
          resetNumberMonthly: Boolean(documentSetting.resetNumberMonthly),
          invoiceCopies: Number(documentSetting.invoiceCopies || 1),
          maxItemsF4: Number(documentSetting.maxItemsF4 || 1),
          maxItemsA4: Number(documentSetting.maxItemsA4 || 1),
          showSignature: Boolean(documentSetting.showSignature),
          showStamp: Boolean(documentSetting.showStamp),
        };

        const response = await settingsApi.updateDocumentSetting(payload);
        const updated =
          response.data?.data?.documentSetting ||
          response.data?.documentSetting ||
          response.data?.data;

        setDocumentSetting({
          ...initialDocumentSetting,
          ...(updated || payload),
        });

        setSuccessMessage("Pengaturan dokumen berhasil disimpan.");
      },
    });
  };

  const handleOpenCreateBank = () => {
    setSelectedBankAccount(null);
    setBankForm({
      ...initialBankForm,
      accountId: assetAccounts[0]?.id || "",
    });
    setErrorMessage("");
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = useCallback((row) => {
    setSelectedBankAccount(row);
    setBankForm({
        accountId: row.accountId || row.account?.id || "",
        name: row.name || "",
        bankName: row.bankName || "",
        accountNumber: row.accountNumber || "",
        accountHolderName: row.accountHolderName || "",
        isDefaultForInvoice: Boolean(row.isDefaultForInvoice),
    });
    setErrorMessage("");
    setIsBankModalOpen(true);
    }, []);

  const handleCloseBankModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsBankModalOpen(false);
    setSelectedBankAccount(null);
    setBankForm(initialBankForm);
  };

  const handleSubmitBank = (event) => {
    event.preventDefault();

    if (!bankForm.accountId) {
      setErrorMessage("Akun perkiraan wajib dipilih.");
      return;
    }

    if (!bankForm.name || !bankForm.bankName || !bankForm.accountNumber) {
      setErrorMessage("Nama rekening, bank, dan nomor rekening wajib diisi.");
      return;
    }

    setConfirmConfig({
      title: selectedBankAccount
        ? "Simpan perubahan rekening invoice?"
        : "Tambah rekening invoice?",
      description:
        "Rekening ini dapat digunakan sebagai akun bank yang tampil pada dokumen invoice.",
      confirmLabel: selectedBankAccount ? "Ya, Simpan" : "Ya, Tambah",
      action: async () => {
        const payload = sanitizePayload(bankForm);

        if (selectedBankAccount) {
          await settingsApi.updateStoreBankAccount(selectedBankAccount.id, payload);
          setSuccessMessage("Rekening invoice berhasil diperbarui.");
        } else {
          await settingsApi.createStoreBankAccount(payload);
          setSuccessMessage("Rekening invoice berhasil ditambahkan.");
        }

        await fetchSettings();
        setIsBankModalOpen(false);
        setSelectedBankAccount(null);
        setBankForm(initialBankForm);
      },
    });
  };

  const handleSetDefaultBank = useCallback(
    (row) => {
        setConfirmConfig({
        title: "Jadikan rekening default invoice?",
        description: `${row.name || row.bankName} akan menjadi rekening utama untuk invoice.`,
        confirmLabel: "Ya, Jadikan Default",
        action: async () => {
            await settingsApi.setDefaultStoreBankAccount(row.id);
            await fetchSettings();
            setSuccessMessage("Rekening default invoice berhasil diperbarui.");
        },
        });
    },
    [fetchSettings]
    );

  const handleToggleBankStatus = useCallback(
    (row) => {
        const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        setConfirmConfig({
        title:
            nextStatus === "ACTIVE"
            ? "Aktifkan rekening invoice?"
            : "Nonaktifkan rekening invoice?",
        description:
            nextStatus === "ACTIVE"
            ? "Rekening akan bisa digunakan kembali untuk invoice."
            : "Rekening tidak akan digunakan untuk invoice baru.",
        confirmLabel:
            nextStatus === "ACTIVE" ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
        action: async () => {
            await settingsApi.updateStoreBankAccountStatus(row.id, nextStatus);
            await fetchSettings();
            setSuccessMessage(
            nextStatus === "ACTIVE"
                ? "Rekening invoice berhasil diaktifkan."
                : "Rekening invoice berhasil dinonaktifkan."
            );
        },
        });
    },
    [fetchSettings]
    );

  const handleConfirmAction = async () => {
    if (!confirmConfig?.action) {
      setConfirmConfig(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await confirmConfig.action();
      setConfirmConfig(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setConfirmConfig(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bankColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Nama Rekening",
        width: "240px",
        align: "center",
        render: (row) => (
          <div className="table-main-text is-center">
            <strong>{row.name || "-"}</strong>
            <span>{row.account?.code ? `${row.account.code} - ${row.account.name}` : "-"}</span>
          </div>
        ),
      },
      {
        key: "bankName",
        label: "Bank",
        width: "170px",
        align: "center",
        render: (row) => row.bankName || "-",
      },
      {
        key: "accountNumber",
        label: "No Rekening",
        width: "190px",
        align: "center",
        render: (row) => <strong>{row.accountNumber || "-"}</strong>,
      },
      {
        key: "accountHolderName",
        label: "Pemilik",
        width: "220px",
        align: "center",
        render: (row) => row.accountHolderName || "-",
      },
      {
        key: "default",
        label: "Default",
        width: "130px",
        align: "center",
        render: (row) =>
          row.isDefaultForInvoice ? (
            <Badge tone="success">Default</Badge>
          ) : (
            <Badge tone="neutral">Tidak</Badge>
          ),
      },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (row) =>
          row.status === "ACTIVE" ? (
            <Badge tone="success">Aktif</Badge>
          ) : (
            <Badge tone="danger">Nonaktif</Badge>
          ),
      },
      {
        key: "actions",
        label: "Aksi",
        width: "280px",
        align: "center",
        render: (row) => (
          <div className="cash-bank-table-actions">
            <Button type="button" variant="secondary" size="sm" onClick={() => handleOpenEditBank(row)}>
              Edit
            </Button>

            {!row.isDefaultForInvoice ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => handleSetDefaultBank(row)}>
                <Star size={14} />
              </Button>
            ) : null}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={
                row.status === "ACTIVE"
                  ? "account-deactivate-icon-button is-active"
                  : "account-deactivate-icon-button is-inactive"
              }
              onClick={() => handleToggleBankStatus(row)}
              title={row.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
            >
              <ShieldCheck size={15} />
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenEditBank, handleSetDefaultBank, handleToggleBankStatus],
  );

  const userColumns = [
  {
    key: "name",
    label: "Nama",
    width: "220px",
    align: "center",
    render: (row) => (
      <div className="table-main-text is-center">
        <strong>{row.name || "-"}</strong>
        <span>{row.employee?.position || "User sistem"}</span>
      </div>
    ),
  },
  {
    key: "username",
    label: "Username",
    width: "180px",
    align: "center",
    render: (row) => <strong>{row.username || "-"}</strong>,
  },
  {
    key: "role",
    label: "Role",
    width: "160px",
    align: "center",
    render: (row) => <Badge tone="info">{getRoleLabel(row.role)}</Badge>,
  },
  {
    key: "employee",
    label: "Karyawan Terhubung",
    width: "220px",
    align: "center",
    render: (row) => row.employee?.name || "-",
  },
  {
    key: "status",
    label: "Status",
    width: "130px",
    align: "center",
    render: (row) =>
      row.status === "ACTIVE" ? (
        <Badge tone="success">Aktif</Badge>
      ) : (
        <Badge tone="danger">Nonaktif</Badge>
      ),
  },
  {
    key: "actions",
    label: "Aksi",
    width: "300px",
    align: "center",
    render: (row) => (
      <div className="cash-bank-table-actions">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleOpenEditUser(row)}
        >
          <Pencil size={14} />
          Edit
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleOpenResetPassword(row)}
        >
          <KeyRound size={14} />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={
            row.status === "ACTIVE"
              ? "account-deactivate-icon-button is-active"
              : "account-deactivate-icon-button is-inactive"
          }
          onClick={() => handleToggleUserStatus(row)}
          title={row.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
        >
          <Power size={15} />
        </Button>
      </div>
    ),
  },
];

  return (
    <ListPageLayout
      eyebrow=""
      title="Pengaturan"
      description="Kelola profil toko, rekening invoice, preferensi operasional, dan pengaturan dokumen resmi."
      actions={
        <Button variant="secondary" onClick={fetchSettings} disabled={isLoading}>
          <RefreshCcw size={16} />
          Refresh
        </Button>
      }
      filters={
        <FilterBar>
          <div className="settings-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={
                    activeTab === tab.key
                      ? "settings-tab is-active"
                      : "settings-tab"
                  }
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </FilterBar>
      }
    >
      {errorMessage ? <div className="page-error-alert">{errorMessage}</div> : null}

      <SettingsSummary activeTab={activeTab} />

      {activeTab === "profile" ? (
        <SettingsCard
          title="Profil Toko"
          description="Data ini digunakan untuk header invoice, slip gaji, laporan, dan dokumen resmi."
          onSave={handleSaveStoreProfile}
          isLoading={isLoading}
        >
          <div className="settings-form-grid">
            <SettingsInput label="Nama Toko" name="name" value={storeProfile.name} onChange={handleStoreProfileChange} required />
            <SettingsInput label="Nama Legal Usaha" name="legalName" value={storeProfile.legalName} onChange={handleStoreProfileChange} />
            <SettingsInput label="Nama Brand Pendek" name="brandShortName" value={storeProfile.brandShortName} onChange={handleStoreProfileChange} />
            <SettingsInput label="Nomor Telepon" name="phone" value={storeProfile.phone} onChange={handleStoreProfileChange} />
            <SettingsInput label="Email" name="email" value={storeProfile.email} onChange={handleStoreProfileChange} />
            <SettingsInput label="Website" name="website" value={storeProfile.website} onChange={handleStoreProfileChange} />
            <SettingsInput label="Instagram / Social Media" name="socialMedia" value={storeProfile.socialMedia} onChange={handleStoreProfileChange} />
            <SettingsInput label="Logo URL" name="logoUrl" value={storeProfile.logoUrl} onChange={handleStoreProfileChange} />
            <SettingsInput label="NPWP" name="taxNumber" value={storeProfile.taxNumber} onChange={handleStoreProfileChange} />
            <SettingsInput label="NIB" name="businessNumber" value={storeProfile.businessNumber} onChange={handleStoreProfileChange} />
            <SettingsTextarea label="Alamat Toko" name="address" value={storeProfile.address} onChange={handleStoreProfileChange} />
          </div>
        </SettingsCard>
      ) : null}

      {activeTab === "bank" ? (
        <SettingsCard
          title="Akun Bank Invoice"
          description="Kelola rekening bank yang akan digunakan sebagai rekening tujuan pada invoice."
          actions={
            <Button variant="primary" onClick={handleOpenCreateBank}>
              <Plus size={16} />
              Tambah Rekening
            </Button>
          }
          isLoading={isLoading}
        >
          <Table
            className="cash-bank-list-table"
            columns={bankColumns}
            data={storeBankAccounts}
            isLoading={isLoading}
            emptyTitle="Rekening invoice belum tersedia"
            emptyDescription="Tambahkan rekening bank untuk ditampilkan pada dokumen invoice."
          />
        </SettingsCard>
      ) : null}

      {activeTab === "operational" ? (
        <SettingsCard
          title="Preferensi Operasional"
          description="Atur default piutang, hutang, metode pembayaran, dan approval penjualan piutang."
          onSave={handleSaveOperational}
          isLoading={isLoading}
        >
          <div className="settings-form-grid">
            <label className="settings-field">
                <span>Default Jatuh Tempo Piutang (Hari)</span>
                <input
                    type="number"
                    name="defaultReceivableDueDays"
                    value={operationalPreferences.defaultReceivableDueDays}
                    onChange={handleOperationalChange}
                    min="0"
                />
                <small className="settings-field-helper">
                    {formatDueDaysLabel(operationalPreferences.defaultReceivableDueDays)}
                </small>
                </label>

                <label className="settings-field">
                <span>Default Jatuh Tempo Hutang (Hari)</span>
                <input
                    type="number"
                    name="defaultPayableDueDays"
                    value={operationalPreferences.defaultPayableDueDays}
                    onChange={handleOperationalChange}
                    min="0"
                />
                <small className="settings-field-helper">
                    {formatDueDaysLabel(operationalPreferences.defaultPayableDueDays)}
                </small>
                </label>

            <label className="settings-field">
              <span>Default Payment Method</span>
              <select
                name="defaultPaymentMethod"
                value={operationalPreferences.defaultPaymentMethod}
                onChange={handleOperationalChange}
              >
                <option value="CASH">Tunai</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </label>

            <label className="settings-field">
              <span>Default Cash/Bank Account</span>
              <select
                name="defaultCashBankAccountId"
                value={operationalPreferences.defaultCashBankAccountId || ""}
                onChange={handleOperationalChange}
              >
                <option value="">Tidak ada default</option>
                {activeCashBankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-toggle-row">
              <input
                type="checkbox"
                name="requireReceivableApproval"
                checked={Boolean(operationalPreferences.requireReceivableApproval)}
                onChange={handleOperationalChange}
              />
              <span>Wajib approval untuk penjualan piutang</span>
            </label>
          </div>
        </SettingsCard>
      ) : null}

      {activeTab === "document" ? (
        <SettingsCard
          title="Pengaturan Dokumen"
          description="Atur prefix, ukuran kertas, rangkap invoice, catatan, dan penanggung jawab dokumen."
          onSave={handleSaveDocument}
          isLoading={isLoading}
        >
            <div className="settings-pdf-preview">
            <div className="settings-pdf-preview-header">
                <span>Header PDF</span>
                <strong>Data diambil dari Profil Toko</strong>
                <p>
                Bagian ini hanya preview. Untuk mengubah identitas usaha, edit dari tab
                Profil Toko.
                </p>
            </div>

            <div className="settings-pdf-preview-grid">
                <div>
                <span>Nama Toko</span>
                <strong>{storeProfile.name || "-"}</strong>
                </div>

                <div>
                <span>Legal Name</span>
                <strong>{storeProfile.legalName || "-"}</strong>
                </div>

                <div>
                <span>Telepon</span>
                <strong>{storeProfile.phone || "-"}</strong>
                </div>

                <div>
                <span>Email</span>
                <strong>{storeProfile.email || "-"}</strong>
                </div>

                <div>
                <span>Website</span>
                <strong>{storeProfile.website || "-"}</strong>
                </div>

                <div>
                <span>Social Media</span>
                <strong>{storeProfile.socialMedia || "-"}</strong>
                </div>

                <div>
                <span>NPWP</span>
                <strong>{storeProfile.taxNumber || "-"}</strong>
                </div>

                <div>
                <span>NIB</span>
                <strong>{storeProfile.businessNumber || "-"}</strong>
                </div>

                <div className="is-full">
                <span>Alamat</span>
                <strong>{storeProfile.address || "-"}</strong>
                </div>
            </div>
            </div>
            
          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Bahasa Dokumen</span>
              <select name="documentLanguage" value={documentSetting.documentLanguage} onChange={handleDocumentChange}>
                <option value="ID">Indonesia</option>
                <option value="EN">English</option>
              </select>
            </label>

            <SettingsInput label="Prefix Invoice" name="salesInvoicePrefix" value={documentSetting.salesInvoicePrefix} onChange={handleDocumentChange} />
            <SettingsInput label="Prefix Retur Penjualan" name="salesReturnPrefix" value={documentSetting.salesReturnPrefix} onChange={handleDocumentChange} />
            <SettingsInput label="Prefix Retur Pembelian" name="purchaseReturnPrefix" value={documentSetting.purchaseReturnPrefix} onChange={handleDocumentChange} />
            <SettingsInput label="Prefix Slip Gaji" name="payrollSlipPrefix" value={documentSetting.payrollSlipPrefix} onChange={handleDocumentChange} />
            <SettingsInput label="Prefix Report" name="reportPrefix" value={documentSetting.reportPrefix} onChange={handleDocumentChange} />
            <SettingsInput label="Prefix Delivery Order" name="deliveryOrderPrefix" value={documentSetting.deliveryOrderPrefix} onChange={handleDocumentChange} />

            <label className="settings-field">
              <span>Default Paper Size</span>
              <select name="defaultPaperSize" value={documentSetting.defaultPaperSize} onChange={handleDocumentChange}>
                <option value="F4">F4</option>
                <option value="A4">A4</option>
              </select>
            </label>

            <label className="settings-field">
              <span>Alternate Paper Size</span>
              <select name="alternatePaperSize" value={documentSetting.alternatePaperSize} onChange={handleDocumentChange}>
                <option value="F4">F4</option>
                <option value="A4">A4</option>
              </select>
            </label>

            <SettingsInput label="Jumlah Rangkap Invoice" name="invoiceCopies" type="number" value={documentSetting.invoiceCopies} onChange={handleDocumentChange} />
            <SettingsInput label="Max Items F4" name="maxItemsF4" type="number" value={documentSetting.maxItemsF4} onChange={handleDocumentChange} />
            <SettingsInput label="Max Items A4" name="maxItemsA4" type="number" value={documentSetting.maxItemsA4} onChange={handleDocumentChange} />

            <SettingsInput label="Label Copy 1" name="copyLabel1" value={documentSetting.copyLabel1} onChange={handleDocumentChange} />
            <SettingsInput label="Label Copy 2" name="copyLabel2" value={documentSetting.copyLabel2} onChange={handleDocumentChange} />
            <SettingsInput label="Label Copy 3" name="copyLabel3" value={documentSetting.copyLabel3} onChange={handleDocumentChange} />

            <SettingsInput label="Penanggung Jawab" name="responsiblePersonName" value={documentSetting.responsiblePersonName} onChange={handleDocumentChange} />
            <SettingsInput label="Jabatan Penanggung Jawab" name="responsiblePersonTitle" value={documentSetting.responsiblePersonTitle} onChange={handleDocumentChange} />
            <SettingsInput label="Signature Text" name="signatureText" value={documentSetting.signatureText} onChange={handleDocumentChange} />

            <SettingsInput label="Signature URL" name="signatureUrl" value={documentSetting.signatureUrl} onChange={handleDocumentChange} />
            <SettingsInput label="Stamp URL" name="stampUrl" value={documentSetting.stampUrl} onChange={handleDocumentChange} />

            <label className="settings-toggle-row">
              <input type="checkbox" name="resetNumberMonthly" checked={Boolean(documentSetting.resetNumberMonthly)} onChange={handleDocumentChange} />
              <span>Reset nomor dokumen setiap bulan</span>
            </label>

            <label className="settings-toggle-row">
              <input type="checkbox" name="showSignature" checked={Boolean(documentSetting.showSignature)} onChange={handleDocumentChange} />
              <span>Tampilkan tanda tangan</span>
            </label>

            <label className="settings-toggle-row">
              <input type="checkbox" name="showStamp" checked={Boolean(documentSetting.showStamp)} onChange={handleDocumentChange} />
              <span>Tampilkan cap/stamp</span>
            </label>

            <SettingsTextarea label="Thank You Note" name="thankYouNote" value={documentSetting.thankYouNote} onChange={handleDocumentChange} />
            <SettingsTextarea label="Catatan Bukti Transaksi" name="transactionProofNote" value={documentSetting.transactionProofNote} onChange={handleDocumentChange} />
            <SettingsTextarea label="Ketentuan Komplain" name="complaintTerms" value={documentSetting.complaintTerms} onChange={handleDocumentChange} />
            <SettingsTextarea label="Ketentuan Retur" name="returnTerms" value={documentSetting.returnTerms} onChange={handleDocumentChange} />
            <SettingsTextarea label="Ketentuan Pembayaran" name="paymentTerms" value={documentSetting.paymentTerms} onChange={handleDocumentChange} />
            <SettingsTextarea label="Catatan Tambahan" name="additionalNote" value={documentSetting.additionalNote} onChange={handleDocumentChange} />
          </div>
        </SettingsCard>
      ) : null}

      {activeTab === "permissions" ? (
        <SettingsCard
            key="permissions"
            title="Hak Akses Role"
            description="Atur fitur dan menu yang dapat diakses oleh admin staff dan staff gudang."
            onSave={handleSaveRolePermissions}
            isLoading={isLoading}
        >
            <div className="settings-permission-layout">
            <div className="settings-permission-role-list">
                <button
                type="button"
                className={
                    selectedPermissionRole === "ADMIN_STAFF"
                    ? "settings-permission-role is-active"
                    : "settings-permission-role"
                }
                onClick={() => setSelectedPermissionRole("ADMIN_STAFF")}
                >
                <strong>Admin Staff</strong>
                <span>Transaksi, laporan, piutang, hutang, dan operasional toko.</span>
                </button>

                <button
                type="button"
                className={
                    selectedPermissionRole === "STAFF_GUDANG"
                    ? "settings-permission-role is-active"
                    : "settings-permission-role"
                }
                onClick={() => setSelectedPermissionRole("STAFF_GUDANG")}
                >
                <strong>Staff Gudang</strong>
                <span>Inventory, histori stok, stock opname, dan retur barang.</span>
                </button>

                <div className="settings-permission-owner-note">
                <strong>OWNER</strong>
                <span>Owner selalu memiliki akses penuh dan tidak bisa dibatasi.</span>
                </div>
            </div>

            <div className="settings-permission-module-panel">
                {Object.entries(groupedModules).map(([groupName, groupModules]) => (
                <section key={groupName} className="settings-permission-group">
                    <div className="settings-permission-group-header">
                    <span>{groupName}</span>
                    </div>

                    <div className="settings-permission-grid">
                    {groupModules.map((moduleItem) => {
                        const isChecked = selectedModuleKeys.has(moduleItem.key);

                        return (
                        <button
                            key={moduleItem.key}
                            type="button"
                            className={
                            isChecked
                                ? "settings-permission-item is-active"
                                : "settings-permission-item"
                            }
                            onClick={() => handleTogglePermission(moduleItem.key)}
                        >
                            <span>{moduleItem.label}</span>
                            <strong>{isChecked ? "Aktif" : "Nonaktif"}</strong>
                        </button>
                        );
                    })}
                    </div>
                </section>
                ))}
            </div>
            </div>
        </SettingsCard>
        ) : null}

        {activeTab === "users" ? (
        <SettingsCard
            key="users"
            title="User & Password"
            description="Kelola akun login, role, status user, dan reset password."
            actions={
            <Button variant="primary" onClick={handleOpenCreateUser}>
                <UserPlus size={16} />
                Tambah User
            </Button>
            }
            isLoading={isLoading}
        >
            <Table
            className="cash-bank-list-table"
            columns={userColumns}
            data={users}
            isLoading={isLoading}
            emptyTitle="User belum tersedia"
            emptyDescription="Tambahkan user agar staff dapat login ke sistem."
            />
        </SettingsCard>
        ) : null}

        {isUserModalOpen
            ? createPortal(
                <div className="cash-bank-modal-backdrop">
                    <form className="cash-bank-form-modal" onSubmit={handleSubmitUser}>
                    <div className="cash-bank-modal-header">
                        <div>
                        <span>{selectedUser ? "Edit User" : "Tambah User"}</span>
                        <strong>{selectedUser?.name || "Akun Login Baru"}</strong>
                        <p>
                            User digunakan untuk login ke sistem sesuai role dan hak akses.
                        </p>
                        </div>

                        <button type="button" onClick={handleCloseUserModal}>
                        <X size={20} />
                        </button>
                    </div>

                    {errorMessage ? (
                        <div className="page-error-alert">{errorMessage}</div>
                    ) : null}

                    <div className="cash-bank-form-grid">
                        <SettingsInput
                        label="Nama User"
                        name="name"
                        value={userForm.name}
                        onChange={handleUserFormChange}
                        />

                        <SettingsInput
                        label="Username"
                        name="username"
                        value={userForm.username}
                        onChange={handleUserFormChange}
                        />

                        {!selectedUser ? (
                        <SettingsInput
                            label="Password"
                            name="password"
                            type="password"
                            value={userForm.password}
                            onChange={handleUserFormChange}
                        />
                        ) : null}

                        <label className="settings-field">
                        <span>Role</span>
                        <select
                            name="role"
                            value={userForm.role}
                            onChange={handleUserFormChange}
                        >
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN_STAFF">Admin Staff</option>
                            <option value="STAFF_GUDANG">Staff Gudang</option>
                        </select>
                        </label>
                    </div>

                    <div className="cash-bank-modal-footer">
                        <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCloseUserModal}
                        disabled={isSubmitting}
                        >
                        Batal
                        </Button>

                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                        <Save size={15} />
                        Simpan
                        </Button>
                    </div>
                    </form>
                </div>,
                document.body
                )
            : null}
        
        {isResetPasswordModalOpen
            ? createPortal(
                <div className="cash-bank-modal-backdrop">
                    <form
                    className="cash-bank-form-modal"
                    onSubmit={handleSubmitResetPassword}
                    >
                    <div className="cash-bank-modal-header">
                        <div>
                        <span>Reset Password</span>
                        <strong>{selectedUser?.name || "-"}</strong>
                        <p>Password baru akan langsung aktif untuk login berikutnya.</p>
                        </div>

                        <button type="button" onClick={handleCloseResetPasswordModal}>
                        <X size={20} />
                        </button>
                    </div>

                    {errorMessage ? (
                        <div className="page-error-alert">{errorMessage}</div>
                    ) : null}

                    <div className="cash-bank-form-grid">
                        <SettingsInput
                        label="Password Baru"
                        name="password"
                        type="password"
                        value={resetPasswordForm.password}
                        onChange={handleResetPasswordFormChange}
                        />
                    </div>

                    <div className="cash-bank-modal-footer">
                        <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCloseResetPasswordModal}
                        disabled={isSubmitting}
                        >
                        Batal
                        </Button>

                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                        <KeyRound size={15} />
                        Reset Password
                        </Button>
                    </div>
                    </form>
                </div>,
                document.body
                )
            : null}

      {isBankModalOpen
        ? createPortal(
            <div className="cash-bank-modal-backdrop">
              <form className="cash-bank-form-modal" onSubmit={handleSubmitBank}>
                <div className="cash-bank-modal-header">
                  <div>
                    <span>{selectedBankAccount ? "Edit Rekening" : "Tambah Rekening"}</span>
                    <strong>Bank Invoice</strong>
                    <p>Rekening ini dapat digunakan sebagai rekening tujuan pada invoice.</p>
                  </div>

                  <button type="button" onClick={handleCloseBankModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="cash-bank-form-grid">
                  <label className="is-full">
                    Akun Perkiraan
                    <select name="accountId" value={bankForm.accountId} onChange={handleBankFormChange}>
                      <option value="">Pilih akun asset</option>
                      {assetAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <SettingsInput label="Nama Rekening" name="name" value={bankForm.name} onChange={handleBankFormChange} />
                  <SettingsInput label="Nama Bank" name="bankName" value={bankForm.bankName} onChange={handleBankFormChange} />
                  <SettingsInput label="Nomor Rekening" name="accountNumber" value={bankForm.accountNumber} onChange={handleBankFormChange} />
                  <SettingsInput label="Nama Pemilik Rekening" name="accountHolderName" value={bankForm.accountHolderName} onChange={handleBankFormChange} />

                  <label className="settings-toggle-row">
                    <input
                      type="checkbox"
                      name="isDefaultForInvoice"
                      checked={Boolean(bankForm.isDefaultForInvoice)}
                      onChange={handleBankFormChange}
                    />
                    <span>Jadikan default invoice</span>
                  </label>
                </div>

                <div className="cash-bank-modal-footer">
                  <Button type="button" variant="secondary" onClick={handleCloseBankModal} disabled={isSubmitting}>
                    Batal
                  </Button>

                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    <Save size={15} />
                    Simpan
                  </Button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {confirmConfig
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmitting ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses...</h2>
                    <p>Sistem sedang menyimpan perubahan pengaturan.</p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>{confirmConfig.title}</h2>
                    <p>{confirmConfig.description}</p>

                    <div className="return-confirm-actions">
                      <Button type="button" variant="secondary" onClick={() => setConfirmConfig(null)} disabled={isSubmitting}>
                        Tidak
                      </Button>

                      <Button type="button" variant="primary" onClick={handleConfirmAction} disabled={isSubmitting}>
                        {confirmConfig.confirmLabel || "Ya, Simpan"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {successMessage
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal return-success-modal">
                <div className="return-confirm-icon is-success">
                  <CheckCircle2 size={42} />
                </div>

                <h2>Berhasil</h2>
                <p>{successMessage}</p>

                <div className="return-confirm-actions is-center">
                  <Button type="button" variant="primary" onClick={() => setSuccessMessage("")}>
                    Selesai
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </ListPageLayout>
  );
}

function SettingsSummary({ activeTab }) {
  const summary = {
    profile: {
      icon: Building2,
      label: "Profil Toko",
      value: "Identitas Usaha",
      helper: "Dipakai dokumen resmi",
      tone: "count",
    },
    bank: {
      icon: CreditCard,
      label: "Bank Invoice",
      value: "Rekening",
      helper: "Tujuan pembayaran invoice",
      tone: "bank",
    },
    operational: {
      icon: Settings2,
      label: "Operasional",
      value: "Default",
      helper: "Piutang, hutang, pembayaran",
      tone: "cash",
    },
    document: {
      icon: FileText,
      label: "Dokumen",
      value: "Invoice & Slip",
      helper: "Prefix, catatan, signature",
      tone: "total",
    },
    permissions: {
    icon: UsersRound,
    label: "Hak Akses",
    value: "Role Menu",
    helper: "Admin staff dan staff gudang",
    tone: "bank",
    },
    users: {
    icon: UserPlus,
    label: "User & Password",
    value: "Akun Login",
    helper: "User, role, status, password",
    tone: "cash",
    },
  };

  const active = summary[activeTab] || summary.profile;
  const Icon = active.icon;

  return (
    <div className="cash-bank-summary-grid">
      <Card className={`cash-bank-summary-card cash-bank-summary-card-${active.tone}`}>
        <div>
          <Icon size={20} />
        </div>
        <span>{active.label}</span>
        <strong>{active.value}</strong>
        <p>{active.helper}</p>
      </Card>
    </div>
  );
}

function SettingsCard({ title, description, children, onSave, actions, isLoading }) {
  return (
    <Card className="settings-card">
      <div className="settings-card-header">
        <div>
          <span>Settings</span>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>

        <div className="settings-card-actions">
          {actions}

          {onSave ? (
            <Button variant="primary" onClick={onSave} disabled={isLoading}>
              <Save size={16} />
              Simpan
            </Button>
          ) : null}
        </div>
      </div>

      {children}
    </Card>
  );
}

function SettingsInput({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <label className="settings-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input type={type} name={name} value={value || ""} onChange={onChange} />
    </label>
  );
}

function SettingsTextarea({ label, name, value, onChange }) {
  return (
    <label className="settings-field is-full">
      <span>{label}</span>
      <textarea name={name} value={value || ""} onChange={onChange} rows={4} />
    </label>
  );
}

function sanitizePayload(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === null || value === undefined) {
        return [key, ""];
      }

      if (typeof value === "string") {
        return [key, value.trim()];
      }

      return [key, value];
    })
  );
}

function formatDueDaysLabel(days) {
  const totalDays = Number(days || 0);

  if (totalDays <= 0) {
    return "Jatuh tempo di hari yang sama dengan transaksi.";
  }

  if (totalDays < 30) {
    return `${totalDays} hari setelah transaksi.`;
  }

  const months = Math.floor(totalDays / 30);
  const remainingDays = totalDays % 30;

  if (remainingDays === 0) {
    return `${totalDays} hari ≈ ${months} bulan setelah transaksi.`;
  }

  return `${totalDays} hari ≈ ${months} bulan ${remainingDays} hari setelah transaksi.`;
}

function getRoleLabel(role) {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN_STAFF") return "Admin Staff";
  if (role === "STAFF_GUDANG") return "Staff Gudang";

  return role || "-";
}

export default SettingsPage;