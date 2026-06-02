import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  RefreshCcw,
  RotateCcw,
  SearchCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import DateRangeFilter from "../../components/form/DateRangeFilter";
import FilterBar from "../../components/form/FilterBar";
import SearchInput from "../../components/form/SearchInput";
import ListPageLayout from "../../components/layout/ListPageLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { journalEntryApi } from "./journalEntry.api";

function JournalEntryListPage() {
  const [journalEntries, setJournalEntries] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    sourceType: "",
    status: "",
  });

  const [selectedJournalEntry, setSelectedJournalEntry] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [selectedReverseJournal, setSelectedReverseJournal] = useState(null);
  const [reverseNote, setReverseNote] = useState("");
  const [isReverseConfirmOpen, setIsReverseConfirmOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const fetchJournalEntries = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await journalEntryApi.getList();
      const responseData = response.data?.data || response.data;

      setJournalEntries(
        Array.isArray(responseData?.journalEntries)
          ? responseData.journalEntries
          : Array.isArray(responseData)
            ? responseData
            : []
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setJournalEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchJournalDetail = useCallback(async (id) => {
    const response = await journalEntryApi.getById(id);
    const responseData = response.data?.data || response.data;
    const journalEntry = responseData?.journalEntry || responseData;

    setSelectedJournalEntry(journalEntry || null);

    return journalEntry || null;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchJournalEntries();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchJournalEntries]);

  const filteredJournalEntries = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return journalEntries.filter((entry) => {
      const searchableText = [
        entry.entryNumber,
        entry.description,
        entry.sourceType,
        entry.status,
        entry.createdBy?.name,
        entry.reversalOf?.entryNumber,
        entry.reversedBy?.entryNumber,
        ...(entry.lines || []).flatMap((line) => [
          line.account?.code,
          line.account?.name,
          line.note,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;
      const matchesDate = isDateInRange(entry.entryDate, filters.dateFrom, filters.dateTo);
      const matchesSource = filters.sourceType
        ? entry.sourceType === filters.sourceType
        : true;
      const matchesStatus = filters.status ? entry.status === filters.status : true;

      return matchesSearch && matchesDate && matchesSource && matchesStatus;
    });
  }, [
    journalEntries,
    debouncedSearch,
    filters.dateFrom,
    filters.dateTo,
    filters.sourceType,
    filters.status,
  ]);

  const journalPagination = usePagination(filteredJournalEntries, {
    pageSize: 15,
    resetKey: `${debouncedSearch}|${filters.dateFrom}|${filters.dateTo}|${filters.sourceType}|${filters.status}`,
  });

  const summary = useMemo(() => {
    return filteredJournalEntries.reduce(
      (current, entry) => {
        const totalDebit = getJournalTotalDebit(entry);
        const isPosted = entry.status === "POSTED";
        const isManual = entry.sourceType === "MANUAL";
        const isReversal = entry.sourceType === "REVERSAL";

        return {
          journalCount: current.journalCount + 1,
          postedCount: current.postedCount + (isPosted ? 1 : 0),
          manualCount: current.manualCount + (isManual ? 1 : 0),
          reversalCount: current.reversalCount + (isReversal ? 1 : 0),
          totalDebit: current.totalDebit + totalDebit,
        };
      },
      {
        journalCount: 0,
        postedCount: 0,
        manualCount: 0,
        reversalCount: 0,
        totalDebit: 0,
      }
    );
  }, [filteredJournalEntries]);

  const handleDateRangeChange = (value) => {
    setFilters((current) => ({
      ...current,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    }));
  };

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
      dateFrom: "",
      dateTo: "",
      sourceType: "",
      status: "",
    });
  };

  const handleOpenDetail = useCallback(
    async (row, event) => {
      event?.preventDefault();
      event?.stopPropagation();

      setIsDetailModalOpen(true);
      setIsDetailLoading(true);
      setSelectedJournalEntry(null);
      setErrorMessage("");

      try {
        await fetchJournalDetail(row.id);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [fetchJournalDetail]
  );

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedJournalEntry(null);
  };

  const handleOpenReverseConfirm = useCallback((row, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    setSelectedReverseJournal(row);
    setReverseNote("");
    setErrorMessage("");
    setIsReverseConfirmOpen(true);
  }, []);

  const handleConfirmReverse = async () => {
    if (!selectedReverseJournal) {
      setIsReverseConfirmOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await journalEntryApi.reverse(selectedReverseJournal.id, {
        note: reverseNote.trim() || undefined,
      });

      await fetchJournalEntries();

      if (selectedJournalEntry?.id === selectedReverseJournal.id) {
        await fetchJournalDetail(selectedJournalEntry.id);
      }

      setIsReverseConfirmOpen(false);
      setSelectedReverseJournal(null);
      setReverseNote("");
      setIsSuccessModalOpen(true);
    } catch (error) {
      setIsReverseConfirmOpen(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "entryDate",
        label: "Tanggal",
        width: "145px",
        align: "center",
        render: (row) => formatDate(row.entryDate),
      },
      {
        key: "entryNumber",
        label: "No Jurnal",
        width: "210px",
        align: "center",
        render: (row) => (
          <span className="purchase-number-cell">{row.entryNumber || "-"}</span>
        ),
      },
      {
        key: "description",
        label: "Deskripsi",
        width: "300px",
        align: "center",
        render: (row) => (
            <div className="table-main-text is-center">
            <strong>{row.description || "-"}</strong>
            </div>
        ),
        },
      {
        key: "sourceType",
        label: "Sumber",
        width: "160px",
        align: "center",
        render: (row) => {
          const source = getJournalSourceMeta(row.sourceType);

          return <Badge tone={source.tone}>{source.label}</Badge>;
        },
      },
      {
        key: "totalDebit",
        label: "Total Debit",
        width: "170px",
        align: "center",
        render: (row) => <strong>{formatCurrency(getJournalTotalDebit(row))}</strong>,
      },
      {
        key: "totalCredit",
        label: "Total Credit",
        width: "170px",
        align: "center",
        render: (row) => (
          <strong>{formatCurrency(getJournalTotalCredit(row))}</strong>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (row) => {
          const status = getJournalStatusMeta(row.status);

          return <Badge tone={status.tone}>{status.label}</Badge>;
        },
      },
      {
        key: "actions",
        label: "Aksi",
        width: "190px",
        align: "center",
        render: (row) => {
          const canReverse =
            row.status === "POSTED" &&
            row.sourceType !== "REVERSAL" &&
            !row.reversedBy;

          return (
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
                className={
                  canReverse
                    ? "journal-reverse-icon-button is-active"
                    : "journal-reverse-icon-button is-disabled"
                }
                onClick={(event) => handleOpenReverseConfirm(row, event)}
                disabled={!canReverse}
                title={canReverse ? "Reverse jurnal" : "Jurnal tidak bisa direverse"}
              >
                <RotateCcw size={15} />
              </Button>
            </div>
          );
        },
      },
    ],
    [handleOpenDetail, handleOpenReverseConfirm]
  );

  return (
    <ListPageLayout
      eyebrow=""
      title="Jurnal"
      description="Pantau jurnal otomatis dan manual, detail debit-credit, status posting, serta reversal jurnal."
      actions={null}
      filters={
        <FilterBar>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari no jurnal, deskripsi, akun, atau sumber..."
          />

          <DateRangeFilter
            value={{
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            }}
            onChange={handleDateRangeChange}
          />

          <select
            className="report-filter-select"
            name="sourceType"
            value={filters.sourceType}
            onChange={handleFilterChange}
          >
            <option value="">Semua Sumber</option>
            <option value="MANUAL">Manual</option>
            <option value="SALE">Penjualan</option>
            <option value="PURCHASE">Pembelian</option>
            <option value="RECEIVABLE_PAYMENT">Pembayaran Piutang</option>
            <option value="PAYABLE_PAYMENT">Pembayaran Hutang</option>
            <option value="EXPENSE">Expense</option>
            <option value="PAYROLL">Payroll</option>
            <option value="SALE_RETURN">Retur Penjualan</option>
            <option value="PURCHASE_RETURN">Retur Pembelian</option>
            <option value="STOCK_OPNAME">Stock Opname</option>
            <option value="REVERSAL">Reversal</option>
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

          <Button variant="secondary" size="sm" onClick={fetchJournalEntries}>
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

      <div className="cash-bank-summary-grid">
        <JournalSummaryCard
          tone="count"
          icon={<SearchCheck size={20} />}
          label="Jumlah Jurnal"
          value={summary.journalCount}
          helper="Jurnal sesuai filter"
        />

        <JournalSummaryCard
          tone="cash"
          icon={<CheckCircle2 size={20} />}
          label="Posted"
          value={summary.postedCount}
          helper="Jurnal aktif"
        />

        <JournalSummaryCard
          tone="bank"
          icon={<BookOpen size={20} />}
          label="Manual"
          value={summary.manualCount}
          helper="Input manual"
        />

        <JournalSummaryCard
          tone="total"
          icon={<CalendarClock size={20} />}
          label="Total Debit"
          value={formatCurrency(summary.totalDebit)}
          helper="Akumulasi jurnal"
        />
      </div>

      <Table
        className="cash-bank-list-table"
        columns={columns}
        data={journalPagination.paginatedData}
        isLoading={isLoading}
        emptyTitle="Jurnal belum tersedia"
        emptyDescription="Belum ada jurnal yang cocok dengan filter saat ini."
      />

      <Pagination
        page={journalPagination.currentPage}
        totalPages={journalPagination.totalPages}
        totalItems={journalPagination.totalItems}
        startItem={journalPagination.startItem}
        endItem={journalPagination.endItem}
        pageSize={journalPagination.pageSize}
        onPageChange={journalPagination.setCurrentPage}
      />

      {isDetailModalOpen
        ? createPortal(
            <div className="receivable-detail-backdrop">
              <div className="receivable-detail-modal journal-detail-modal">
                <div className="receivable-detail-header">
                  <div>
                    <span>Detail Jurnal</span>
                    <strong>{selectedJournalEntry?.entryNumber || "-"}</strong>
                    <p>
                      {selectedJournalEntry?.entryDate
                        ? `Tanggal ${formatDate(selectedJournalEntry.entryDate)}`
                        : "Memuat detail jurnal..."}
                    </p>
                  </div>

                  <button type="button" onClick={handleCloseDetail}>
                    <X size={20} />
                  </button>
                </div>

                {isDetailLoading ? (
                  <div className="return-empty-state">Memuat detail jurnal...</div>
                ) : null}

                {!isDetailLoading && selectedJournalEntry ? (
                  <>
                    <div className="receivable-detail-summary">
                      <div>
                        <span>Sumber</span>
                        <strong>
                          {getJournalSourceMeta(selectedJournalEntry.sourceType).label}
                        </strong>
                      </div>

                      <div>
                        <span>Status</span>
                        <strong>
                          {getJournalStatusMeta(selectedJournalEntry.status).label}
                        </strong>
                      </div>

                      <div>
                        <span>Total Debit</span>
                        <strong>
                          {formatCurrency(getJournalTotalDebit(selectedJournalEntry))}
                        </strong>
                      </div>

                      <div>
                        <span>Total Credit</span>
                        <strong>
                          {formatCurrency(getJournalTotalCredit(selectedJournalEntry))}
                        </strong>
                      </div>

                      <div>
                        <span>Dibuat Oleh</span>
                        <strong>
                          {selectedJournalEntry.createdBy?.name ||
                            selectedJournalEntry.createdBy?.username ||
                            "-"}
                        </strong>
                      </div>
                    </div>

                    {selectedJournalEntry.reversalOf ? (
                      <div className="page-warning-alert">
                        Reversal dari jurnal {selectedJournalEntry.reversalOf.entryNumber}.
                      </div>
                    ) : null}

                    {selectedJournalEntry.reversedBy ? (
                      <div className="page-warning-alert">
                        Jurnal ini sudah direverse oleh{" "}
                        {selectedJournalEntry.reversedBy.entryNumber}.
                      </div>
                    ) : null}

                    <div className="receivable-detail-section">
                      <div className="return-section-title">
                        <FileText size={18} />
                        <span>Debit & Credit</span>
                      </div>

                      <div className="journal-line-list">
                        {(selectedJournalEntry.lines || []).map((line) => (
                          <div className="journal-line-item" key={line.id}>
                            <div>
                              <span>Akun</span>
                              <strong>
                                {line.account?.code || "-"} -{" "}
                                {line.account?.name || "-"}
                              </strong>
                              <p>{line.note || "-"}</p>
                            </div>

                            <section>
                              <span>Debit</span>
                              <strong>{formatCurrency(line.debit || 0)}</strong>
                            </section>

                            <section>
                              <span>Credit</span>
                              <strong>{formatCurrency(line.credit || 0)}</strong>
                            </section>
                          </div>
                        ))}
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

                      {selectedJournalEntry.status === "POSTED" &&
                      selectedJournalEntry.sourceType !== "REVERSAL" &&
                      !selectedJournalEntry.reversedBy ? (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={(event) =>
                            handleOpenReverseConfirm(selectedJournalEntry, event)
                          }
                        >
                          <RotateCcw size={15} />
                          Reverse Jurnal
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {isReverseConfirmOpen
        ? createPortal(
            <div className="return-confirm-backdrop">
              <div className="return-confirm-modal">
                {isSubmitting ? (
                  <>
                    <div className="return-confirm-icon is-processing">
                      <Loader2 className="return-loading-icon" size={38} />
                    </div>

                    <h2>Memproses reversal...</h2>

                    <p>
                      Sistem sedang membuat jurnal pembalik dan membatalkan jurnal
                      awal.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="return-confirm-icon is-warning">
                      <AlertTriangle size={34} />
                    </div>

                    <h2>Reverse jurnal ini?</h2>

                    <p>
                      Sistem akan membuat jurnal pembalik dan status jurnal awal
                      menjadi cancelled.
                    </p>

                    <div className="return-confirm-summary">
                      <div>
                        <span>No Jurnal</span>
                        <strong>{selectedReverseJournal?.entryNumber || "-"}</strong>
                      </div>

                      <div>
                        <span>Total</span>
                        <strong>
                          {formatCurrency(
                            getJournalTotalDebit(selectedReverseJournal)
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Sumber</span>
                        <strong>
                          {
                            getJournalSourceMeta(selectedReverseJournal?.sourceType)
                              .label
                          }
                        </strong>
                      </div>
                    </div>

                    <label className="journal-reversal-note">
                        <span>Catatan reversal</span>
                        <textarea
                            value={reverseNote}
                            onChange={(event) => setReverseNote(event.target.value)}
                            placeholder="Opsional..."
                            rows={3}
                        />
                        </label>

                    <div className="return-confirm-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsReverseConfirmOpen(false)}
                        disabled={isSubmitting}
                      >
                        Tidak
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleConfirmReverse}
                        disabled={isSubmitting}
                      >
                        Ya, Reverse
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

                <h2>Jurnal berhasil direverse</h2>

                <p>
                  Jurnal pembalik sudah dibuat dan jurnal awal sudah berubah
                  menjadi cancelled.
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
    </ListPageLayout>
  );
}

function JournalSummaryCard({
  tone = "neutral",
  icon,
  label,
  value,
  helper,
}) {
  return (
    <Card className={`cash-bank-summary-card cash-bank-summary-card-${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function getJournalTotalDebit(entry) {
  return (entry?.lines || []).reduce(
    (total, line) => total + Number(line.debit || 0),
    0
  );
}

function getJournalTotalCredit(entry) {
  return (entry?.lines || []).reduce(
    (total, line) => total + Number(line.credit || 0),
    0
  );
}

function getJournalStatusMeta(status) {
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

function getJournalSourceMeta(sourceType) {
  const sources = {
    MANUAL: {
      label: "Manual",
      tone: "info",
    },
    SALE: {
      label: "Penjualan",
      tone: "success",
    },
    PURCHASE: {
      label: "Pembelian",
      tone: "warning",
    },
    RECEIVABLE_PAYMENT: {
      label: "Bayar Piutang",
      tone: "success",
    },
    PAYABLE_PAYMENT: {
      label: "Bayar Hutang",
      tone: "warning",
    },
    EXPENSE: {
      label: "Expense",
      tone: "danger",
    },
    PAYROLL: {
      label: "Payroll",
      tone: "warning",
    },
    SALE_RETURN: {
      label: "Retur Penjualan",
      tone: "danger",
    },
    PURCHASE_RETURN: {
      label: "Retur Pembelian",
      tone: "warning",
    },
    STOCK_OPNAME: {
      label: "Stock Opname",
      tone: "info",
    },
    REVERSAL: {
      label: "Reversal",
      tone: "danger",
    },
  };

  return (
    sources[sourceType] || {
      label: sourceType || "-",
      tone: "neutral",
    }
  );
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

export default JournalEntryListPage;