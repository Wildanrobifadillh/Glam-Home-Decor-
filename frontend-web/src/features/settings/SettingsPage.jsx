import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  ShieldCheck,
  Star,
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
      ] = await Promise.all([
        settingsApi.getStoreProfile(),
        settingsApi.getStoreBankAccounts(),
        settingsApi.getOperationalPreferences(),
        settingsApi.getDocumentSetting(),
        accountApi.getList(),
        cashBankApi.getList(),
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

export default SettingsPage;