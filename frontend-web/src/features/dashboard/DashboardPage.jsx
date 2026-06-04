import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarDays,
  CreditCard,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { settingsApi } from "../settings/settings.api";
import {
  getAllowedModuleKeysByRole,
  getSidebarFooterItemsByModuleKeys,
  getSidebarGroupsByModuleKeys,
} from "../../constants/sidebarMenu";

import dashboardHero from "../../assets/images/login-background.png";
import Button from "../../components/ui/Button";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { authStore } from "../auth/auth.store";
import { dashboardApi } from "./dashboard.api";

const periodOptions = [
  {
    value: "DAY",
    label: "Hari",
  },
  {
    value: "MONTH",
    label: "Bulan",
  },
  {
    value: "YEAR",
    label: "Tahun",
  },
];

const getFirstAccessiblePath = (moduleKeys = []) => {
  const filteredModuleKeys = moduleKeys.filter((key) => key !== "dashboard");

  const groups = getSidebarGroupsByModuleKeys(filteredModuleKeys);
  const footerItems = getSidebarFooterItemsByModuleKeys(filteredModuleKeys);

  return (
    groups[0]?.items?.[0]?.path ||
    footerItems[0]?.path ||
    "/login"
  );
};

function DashboardPage() {
  const user = authStore.getUser();
  const navigate = useNavigate();
  
  const [hasDashboardAccess, setHasDashboardAccess] = useState(
    user?.role === "OWNER"
  );
  const [isCheckingDashboardAccess, setIsCheckingDashboardAccess] = useState(
    user?.role !== "OWNER"
  );

  const [periodType, setPeriodType] = useState("MONTH");
  const [selectedDate, setSelectedDate] = useState(getTodayDateInput());
  const [ownerDashboard, setOwnerDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchOwnerDashboard = useCallback(async () => {
    if (user?.role !== "OWNER") {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await dashboardApi.getOwnerDashboard({
        periodType,
        date: selectedDate,
      });

      const dashboard =
        response.data?.data?.dashboard ||
        response.data?.dashboard ||
        response.data?.data ||
        null;

      setOwnerDashboard(dashboard);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [periodType, selectedDate, user?.role]);

    useEffect(() => {
    let isMounted = true;

    const checkDashboardAccess = async () => {
      if (!user?.role) {
        if (isMounted) {
          setHasDashboardAccess(false);
          setIsCheckingDashboardAccess(false);
        }
        return;
      }

      if (user.role === "OWNER") {
        if (isMounted) {
          setHasDashboardAccess(true);
          setIsCheckingDashboardAccess(false);
        }
        return;
      }

      setIsCheckingDashboardAccess(true);

      try {
        const response = await settingsApi.getMyPermissions();
        const responseData = response.data?.data || response.data;

        const myPermissions =
          responseData?.myPermissions ||
          responseData?.rolePermissions ||
          responseData;

        const allowedModuleKeys =
          myPermissions?.permissions
            ?.filter((permission) => permission.canAccess)
            .map((permission) => permission.key) || [];

        const fallbackModuleKeys = getAllowedModuleKeysByRole(user.role);
        const finalModuleKeys =
          allowedModuleKeys.length > 0 ? allowedModuleKeys : fallbackModuleKeys;

        const canAccessDashboard = finalModuleKeys.includes("dashboard");

        if (!isMounted) {
          return;
        }

        setHasDashboardAccess(canAccessDashboard);
        setIsCheckingDashboardAccess(false);

        if (!canAccessDashboard) {
          const redirectPath = getFirstAccessiblePath(finalModuleKeys);
          navigate(redirectPath, { replace: true });
        }
      } catch {
        const fallbackModuleKeys = getAllowedModuleKeysByRole(user.role);
        const canAccessDashboard = fallbackModuleKeys.includes("dashboard");

        if (!isMounted) {
          return;
        }

        setHasDashboardAccess(canAccessDashboard);
        setIsCheckingDashboardAccess(false);

        if (!canAccessDashboard) {
          const redirectPath = getFirstAccessiblePath(fallbackModuleKeys);
          navigate(redirectPath, { replace: true });
        }
      }
    };

    checkDashboardAccess();

    return () => {
      isMounted = false;
    };
  }, [navigate, user?.role]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchOwnerDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchOwnerDashboard]);

    if (user?.role !== "OWNER") {
    if (isCheckingDashboardAccess) {
      return null;
    }

    if (!hasDashboardAccess) {
      return null;
    }

    return <NonOwnerDashboard user={user} />;
  }

  const dashboard = ownerDashboard || {};
  const apiPeriod = dashboard.period || getFallbackPeriod(periodType, selectedDate);
  const kpi = dashboard.kpi || {};
  const profitLoss = dashboard.profitLoss || {};
  const cashBank = dashboard.cashBank || {};
  const receivables = dashboard.receivables || {};
  const payables = dashboard.payables || {};
  const inventory = dashboard.inventory || {};
  const charts = dashboard.charts || {};
  const alerts = dashboard.alerts || {};

  const totalRevenue = getNumber(kpi.totalRevenue);
  const netProfit = getNumber(kpi.netProfit);
  const cashBankBalance = getNumber(kpi.cashBankBalance);
  const receivableRemaining = getNumber(kpi.receivableRemaining);
  const payableRemaining = getNumber(kpi.payableRemaining);
  const inventoryWealthByHpp = getNumber(kpi.inventoryWealthByHpp);

  const totalCOGS = getNumber(profitLoss.totalCOGS);
  const grossProfit = getNumber(profitLoss.grossProfit);
  const totalExpense = getNumber(profitLoss.totalExpense);

  const cashIn = getNumber(cashBank.totalInflow);
  const cashOut = getNumber(cashBank.totalOutflow);
  const cashNet = getNumber(cashBank.netChange);

  const revenueProfitTrend = charts.revenueProfitTrend || [];
  const cashFlowTrend = charts.cashFlowTrend || [];
  const assetSnapshot = charts.assetSnapshot || [];
  const lowStockProducts =
    alerts.lowStockProducts || inventory.lowStockProducts || [];

  return (
    <div className="dashboard-page-v3">
      <section className="dashboard-hero-v3 dashboard-owner-hero">
        <div className="dashboard-hero-content">
          <p>Selamat datang kembali,</p>
          <h1>{getDisplayName(user)}!</h1>
        </div>
      </section>

      <section className="dashboard-owner-filter-card">
        <div className="dashboard-owner-toolbar">
          <div className="dashboard-period-toggle">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  periodType === option.value
                    ? "dashboard-period-button is-active"
                    : "dashboard-period-button"
                }
                onClick={() => setPeriodType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="dashboard-date-filter">
            <CalendarDays size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            onClick={fetchOwnerDashboard}
            disabled={isLoading}
          >
            <RefreshCcw size={16} />
            Refresh
          </Button>
        </div>
      </section>

      {errorMessage ? (
        <div className="page-error-alert">{errorMessage}</div>
      ) : null}

      <section className="dashboard-stat-grid-v3 dashboard-owner-kpi-grid">
        <StatCard
          icon={ShoppingBag}
          label="Total Pendapatan"
          value={formatCurrency(totalRevenue)}
          trend="Akumulasi revenue periode ini"
          isLoading={isLoading}
        />

        <StatCard
          icon={TrendingUp}
          label="Laba Bersih"
          value={formatCurrency(netProfit)}
          trend="Revenue dikurangi HPP dan beban"
          danger={netProfit < 0}
          isLoading={isLoading}
        />

        <StatCard
          icon={WalletCards}
          label="Saldo Kas/Bank"
          value={formatCurrency(cashBankBalance)}
          trend={`${cashBank.cashBankAccountCount || 0} akun kas/bank aktif`}
          isLoading={isLoading}
        />

        <StatCard
          icon={ReceiptText}
          label="Piutang Belum Lunas"
          value={formatCurrency(receivableRemaining)}
          trend={`${receivables.receivableCount || 0} piutang tercatat`}
          warning={receivableRemaining > 0}
          isLoading={isLoading}
        />

        <StatCard
          icon={CreditCard}
          label="Hutang Belum Lunas"
          value={formatCurrency(payableRemaining)}
          trend={`${payables.payableCount || 0} hutang tercatat`}
          warning={payableRemaining > 0}
          isLoading={isLoading}
        />

        <StatCard
          icon={Boxes}
          label="Nilai Kekayaan Barang"
          value={formatCurrency(inventoryWealthByHpp)}
          trend="Berdasarkan HPP × stok tersedia"
          isLoading={isLoading}
        />
        <div className="dashboard-kpi-alert-card">
          <div className="dashboard-kpi-alert-header">
            <div>
              <h2>Alert Stok Rendah</h2>
              <p>{formatNumber(inventory.lowStockCount)} produk perlu dicek</p>
            </div>

            <a href="/inventory">Lihat inventory</a>
          </div>

          <LowStockList products={lowStockProducts} limit={2} />
        </div>
      </section>

<section className="dashboard-bi-grid">
  <div className="dashboard-card-v3 dashboard-bi-chart-card">
    <div className="dashboard-card-header-v3 dashboard-chart-card-header">
      <div className="dashboard-chart-title-stack">
        <h2>Revenue, Beban & Profit</h2>

        <ChartLegend
          items={[
            { label: "Revenue", tone: "is-revenue" },
            { label: "Beban", tone: "is-expense" },
            { label: "Profit", tone: "is-profit" },
          ]}
        />
      </div>

      <button type="button">{apiPeriod.label}</button>
    </div>

    <RevenueProfitChart data={revenueProfitTrend} isLoading={isLoading} />
  </div>

  <div className="dashboard-card-v3">
    <div className="dashboard-card-header-v3">
      <h2>KPI Laba Rugi</h2>
      <a href="/reports">Lihat laporan</a>
    </div>

    <div className="owner-dashboard-summary-list">
      <SummaryRow
        label="Total Revenue"
        value={formatCurrency(totalRevenue)}
      />
      <SummaryRow
        label="Harga Pokok / COGS"
        value={formatCurrency(totalCOGS)}
      />
      <SummaryRow label="Laba Kotor" value={formatCurrency(grossProfit)} />
      <SummaryRow
        label="Total Beban"
        value={formatCurrency(totalExpense)}
        danger
      />
      <SummaryRow
        label="Laba Bersih"
        value={formatCurrency(netProfit)}
        strong
        danger={netProfit < 0}
      />
    </div>
  </div>

  <div className="dashboard-card-v3 dashboard-bi-chart-card">
    <div className="dashboard-card-header-v3 dashboard-chart-card-header">
      <div className="dashboard-chart-title-stack">
        <h2>Kas Masuk vs Keluar</h2>

        <ChartLegend
          items={[
            { label: "Kas Masuk", tone: "is-cash-in" },
            { label: "Kas Keluar", tone: "is-cash-out" },
          ]}
        />
      </div>

      <button type="button">{apiPeriod.label}</button>
    </div>

    <CashFlowChart data={cashFlowTrend} isLoading={isLoading} />
  </div>

  <div className="dashboard-card-v3">
    <div className="dashboard-card-header-v3">
      <h2>Arus Kas</h2>
      <a href="/reports">Lihat laporan</a>
    </div>

    <div className="owner-dashboard-cash-grid">
      <MiniMetric
        icon={TrendingUp}
        label="Kas Masuk"
        value={formatCurrency(cashIn)}
      />
      <MiniMetric
        icon={TrendingDown}
        label="Kas Keluar"
        value={formatCurrency(cashOut)}
        danger
      />
      <MiniMetric
        icon={Banknote}
        label="Net Change"
        value={formatCurrency(cashNet)}
        warning={cashNet < 0}
      />
    </div>
  </div>

  <div className="dashboard-card-v3">
    <div className="dashboard-card-header-v3">
      <h2>Komposisi Aset Operasional</h2>
      <button type="button">Snapshot</button>
    </div>

    <AssetSnapshot data={assetSnapshot} />
  </div>

  <div className="dashboard-card-v3">
    <div className="dashboard-card-header-v3">
      <h2>Inventory</h2>
      <a href="/products">Lihat barang</a>
    </div>

    <div className="owner-dashboard-cash-grid">
      <MiniMetric
        icon={Boxes}
        label="Total Produk Aktif"
        value={formatNumber(inventory.totalProduct)}
      />
      <MiniMetric
        icon={ShoppingBag}
        label="Total Qty Stok"
        value={formatNumber(inventory.totalStockQty)}
      />
      <MiniMetric
        icon={AlertTriangle}
        label="Stok Rendah"
        value={formatNumber(inventory.lowStockCount)}
        warning={getNumber(inventory.lowStockCount) > 0}
      />
    </div>
  </div>
</section>
    </div>
  );
}

function NonOwnerDashboard({ user }) {
  return (
    <div className="dashboard-page-v3">
      <section className="dashboard-hero-v3">
        <div className="dashboard-hero-content">
          <p>Selamat datang kembali,</p>
          <h1>{getDisplayName(user)}!</h1>
          <span>
            Dashboard role ini akan disesuaikan setelah kebutuhan akses data
            dikonfirmasi dengan klien.
          </span>
          <em>“Fokus pada pekerjaan hari ini dan jaga data tetap rapi.”</em>
        </div>

        <img src={dashboardHero} alt="Interior Glam Home Decor" />
      </section>

      <section className="dashboard-body-grid-v3">
        <div className="dashboard-card-v3 placeholder-page-v3">
          <p>Dashboard</p>
          <h1>{getRoleLabel(user?.role)}</h1>
          <span>
            Tampilan dashboard untuk role ini belum diaktifkan karena menunggu
            keputusan akses data dari klien.
          </span>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, danger, warning, isLoading }) {
  return (
    <div className="stat-card-v3">
      <div className="stat-icon-v3">
        <Icon size={22} />
      </div>

      <div>
        <p>{label}</p>
        <h2>{isLoading ? "Memuat..." : value}</h2>
        <span className={danger ? "is-danger" : warning ? "is-warning" : ""}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function RevenueProfitChart({ data, isLoading }) {
  if (isLoading) {
    return <div className="dashboard-chart-empty">Memuat grafik...</div>;
  }

  if (!data.length) {
    return <div className="dashboard-chart-empty">Data grafik belum tersedia.</div>;
  }

  const maxValue = Math.max(
    ...data.flatMap((item) => [
      Math.abs(getNumber(item.revenue)),
      Math.abs(getNumber(item.expense)),
      Math.abs(getNumber(item.profit)),
    ]),
    1
  );

  return (
    <div className="dashboard-bi-chart">
      <div
        className="dashboard-bi-chart-bars"
        style={{ "--dashboard-chart-count": data.length }}
      >
        {data.map((item) => {
          const revenue = getNumber(item.revenue);
          const expense = getNumber(item.expense);
          const profit = getNumber(item.profit);

          return (
            <div key={item.key} className="dashboard-bi-bar-group">
              <div className="dashboard-bi-bar-stack">
                <span
                  className="dashboard-bi-bar is-revenue"
                  style={{ height: `${getBarHeight(revenue, maxValue)}%` }}
                  title={`Revenue ${formatCurrency(revenue)}`}
                />
                <span
                  className="dashboard-bi-bar is-expense"
                  style={{ height: `${getBarHeight(expense, maxValue)}%` }}
                  title={`Expense ${formatCurrency(expense)}`}
                />
                <span
                  className={
                    profit < 0
                      ? "dashboard-bi-bar is-profit is-negative"
                      : "dashboard-bi-bar is-profit"
                  }
                  style={{ height: `${getBarHeight(profit, maxValue)}%` }}
                  title={`Profit ${formatCurrency(profit)}`}
                />
              </div>

              <small>{item.label}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CashFlowChart({ data, isLoading }) {
  if (isLoading) {
    return <div className="dashboard-chart-empty">Memuat grafik...</div>;
  }

  if (!data.length) {
    return <div className="dashboard-chart-empty">Data arus kas belum tersedia.</div>;
  }

  const maxValue = Math.max(
    ...data.flatMap((item) => [
      Math.abs(getNumber(item.cashIn)),
      Math.abs(getNumber(item.cashOut)),
    ]),
    1
  );

  return (
    <div className="dashboard-bi-chart">
      <div
        className="dashboard-bi-chart-bars"
        style={{ "--dashboard-chart-count": data.length }}
      >
        {data.map((item) => {
          const cashIn = getNumber(item.cashIn);
          const cashOut = getNumber(item.cashOut);

          return (
            <div key={item.key} className="dashboard-bi-bar-group">
              <div className="dashboard-bi-bar-stack">
                <span
                  className="dashboard-bi-bar is-cash-in"
                  style={{ height: `${getBarHeight(cashIn, maxValue)}%` }}
                  title={`Kas Masuk ${formatCurrency(cashIn)}`}
                />
                <span
                  className="dashboard-bi-bar is-cash-out"
                  style={{ height: `${getBarHeight(cashOut, maxValue)}%` }}
                  title={`Kas Keluar ${formatCurrency(cashOut)}`}
                />
              </div>

              <small>{item.label}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div className="dashboard-bi-legend">
      {items.map((item) => (
        <span key={item.label} className={item.tone}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function AssetSnapshot({ data }) {
  const total = data.reduce((sum, item) => sum + getNumber(item.value), 0);

  if (!data.length || total <= 0) {
    return (
      <div className="dashboard-chart-empty">
        Komposisi aset operasional belum tersedia.
      </div>
    );
  }

  return (
    <div className="dashboard-asset-list">
      {data.map((item) => {
        const value = getNumber(item.value);
        const percentage = total > 0 ? (value / total) * 100 : 0;

        return (
          <div key={item.label} className="dashboard-asset-row">
            <div>
              <span>{item.label}</span>
              <strong>{formatCurrency(value)}</strong>
            </div>

            <div className="dashboard-asset-progress">
              <span style={{ width: `${percentage}%` }} />
            </div>

            <em>{percentage.toFixed(1)}%</em>
          </div>
        );
      })}
    </div>
  );
}

function LowStockList({ products, limit = 8 }) {
  if (!products.length) {
    return (
      <div className="dashboard-chart-empty">
        Tidak ada produk stok rendah untuk periode ini.
      </div>
    );
  }

  return (
    <div className="dashboard-low-stock-list">
      {products.slice(0, limit).map((product) => (
        <div key={product.id} className="dashboard-low-stock-item">
          <div>
            <strong>{product.name}</strong>
            <span>
              {product.searchCode || product.supplierCode || "-"} •{" "}
              {product.categoryName || "-"}
            </span>
          </div>

          <div>
            <p>Stok</p>
            <strong>{formatNumber(product.stock)}</strong>
          </div>

          <div>
            <p>Min</p>
            <strong>{formatNumber(product.minStock)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, strong, danger }) {
  return (
    <div
      className={
        strong
          ? "owner-dashboard-summary-row is-strong"
          : "owner-dashboard-summary-row"
      }
    >
      <span>{label}</span>
      <strong className={danger ? "is-danger" : ""}>{value}</strong>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value, danger, warning }) {
  return (
    <div className="owner-dashboard-mini-metric">
      <div>
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong className={danger ? "is-danger" : warning ? "is-warning" : ""}>
        {value}
      </strong>
    </div>
  );
}

function getFallbackPeriod(periodType, selectedDate) {
  const date = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();

  if (periodType === "DAY") {
    return {
      label: new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date),
    };
  }

  if (periodType === "YEAR") {
    return {
      label: String(date.getFullYear()),
    };
  }

  return {
    label: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

function getTodayDateInput() {
  return formatDateInput(new Date());
}

function formatDateInput(date) {
  const adjustedDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return adjustedDate.toISOString().slice(0, 10);
}

function getBarHeight(value, maxValue) {
  const numberValue = Math.abs(getNumber(value));

  if (numberValue <= 0) {
    return 3;
  }

  return Math.max((numberValue / maxValue) * 100, 8);
}

function getNumber(...values) {
  for (const value of values) {
    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
}

function formatCurrency(value) {
  return `Rp. ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getDisplayName(user) {
  return user?.name || user?.username || "User";
}

function getRoleLabel(role) {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN_STAFF") return "Admin Staff";
  if (role === "STAFF_GUDANG") return "Staff Gudang";

  return role || "-";
}

export default DashboardPage;