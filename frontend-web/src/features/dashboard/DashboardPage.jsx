import {
  AlertTriangle,
  Boxes,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";

import dashboardHero from "../../assets/images/login-background.png";
import { authStore } from "../auth/auth.store";

function DashboardPage() {
  const user = authStore.getUser();

  return (
    <div className="dashboard-page-v3">
      <section className="dashboard-hero-v3">
        <div className="dashboard-hero-content">
          <p>Selamat datang kembali,</p>
          <h1>{getDisplayName(user)}!</h1>
          <span>
            Semoga Harimu Menyenangkan, penuh semangat dan ceria.
          </span>
          <em>“Lebetkeun kata kata motifasina pak ijuyyy!!!!”</em>
        </div>

        <img src={dashboardHero} alt="Interior Glam Home Decor" />
      </section>

      <section className="dashboard-stat-grid-v3">
        <StatCard
          icon={ShoppingBag}
          label="Penjualan Hari Ini"
          value="Rp. 12.450.000"
          trend="▲ 12.5% dari kemarin"
        />
        <StatCard
          icon={ShoppingCart}
          label="Pembelian Hari Ini"
          value="Rp. 8.750.000"
          trend="▼ 5.4% dari kemarin"
          danger
        />
        <StatCard
          icon={Boxes}
          label="Total Produk"
          value="1.248"
          trend="▲ 8 produk baru"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stok Rendah"
          value="23"
          trend="Lihat detail →"
          warning
        />
        <StatCard
          icon={Users}
          label="Total Pelanggan"
          value="356"
          trend="▲ 18 pelanggan baru"
        />
      </section>

      <section className="dashboard-body-grid-v3">
        <div className="dashboard-card-v3 chart-card-v3">
          <div className="dashboard-card-header-v3">
            <h2>Ringkasan Penjualan</h2>
            <button type="button">7 Hari Terakhir</button>
          </div>

          <div className="chart-placeholder-v3">
            <div className="chart-line-v3" />
          </div>
        </div>

        <div className="dashboard-card-v3">
          <div className="dashboard-card-header-v3">
            <h2>Penjualan Terbaru</h2>
            <a href="/sales">Lihat semua</a>
          </div>

          <div className="recent-list-v3">
            <RecentItem code="INV-250522-005" amount="Rp. 2.450.000" />
            <RecentItem code="INV-250522-004" amount="Rp. 1.850.000" />
            <RecentItem code="INV-250522-003" amount="Rp. 3.200.000" />
            <RecentItem code="INV-250522-002" amount="Rp. 1.980.000" />
          </div>
        </div>

        <div className="dashboard-card-v3">
          <div className="dashboard-card-header-v3">
            <h2>Pengingat Penting</h2>
            <a href="/reports">Lihat semua</a>
          </div>

          <div className="reminder-item-v3">
            <ReceiptText size={20} />
            <div>
              <h3>Stock Opname Bulanan</h3>
              <p>Lakukan stock opname untuk akurasi data stok.</p>
            </div>
            <span>31 Mei 2025</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, danger, warning }) {
  return (
    <div className="stat-card-v3">
      <div className="stat-icon-v3">
        <Icon size={22} />
      </div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span className={danger ? "is-danger" : warning ? "is-warning" : ""}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function RecentItem({ code, amount }) {
  return (
    <div className="recent-item-v3">
      <div>
        <h3>{code}</h3>
        <p>22 Mei 2025 • 14:30</p>
      </div>

      <strong>{amount}</strong>
      <span>Selesai</span>
    </div>
  );
}

function getDisplayName(user) {
  if (user?.role === "OWNER") {
    return "Zaid Ishmatul Fawaid";
  }

  return user?.name || "User";
}

export default DashboardPage;