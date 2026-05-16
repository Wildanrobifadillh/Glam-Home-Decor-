import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import LoginPage from "../features/auth/LoginPage.jsx";
import { authStore } from "../features/auth/auth.store.js";
import DashboardPage from "../features/dashboard/DashboardPage.jsx";
import CategoryListPage from "../features/categories/CategoryListPage.jsx";
import PlaceholderPage from "../features/dashboard/PlaceholderPage.jsx";
import SupplierListPage from "../features/suppliers/SupplierListPage.jsx";

function ProtectedRoute({ children }) {
  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  if (authStore.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoryListPage />} />
          <Route path="/products" element={<PlaceholderPage title="Barang" />} />
          <Route path="/suppliers" element={<SupplierListPage />} />
          <Route path="/customers" element={<PlaceholderPage title="Pelanggan" />} />
          <Route path="/employees" element={<PlaceholderPage title="Karyawan" />} />
          <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
          <Route path="/stock-history" element={<PlaceholderPage title="Histori Stok" />} />
          <Route path="/stock-opname" element={<PlaceholderPage title="Stock Opname" />} />
          <Route path="/purchases" element={<PlaceholderPage title="Pembelian" />} />
          <Route path="/sales" element={<PlaceholderPage title="Penjualan" />} />
          <Route path="/returns" element={<PlaceholderPage title="Retur" />} />
          <Route path="/receivables" element={<PlaceholderPage title="Piutang" />} />
          <Route path="/payables" element={<PlaceholderPage title="Hutang" />} />
          <Route path="/payroll" element={<PlaceholderPage title="Payroll" />} />
          <Route path="/journal-entries" element={<PlaceholderPage title="Jurnal" />} />
          <Route path="/accounting" element={<PlaceholderPage title="Akun Perkiraan" />} />
          <Route path="/reports" element={<PlaceholderPage title="Laporan" />} />
          <Route path="/settings" element={<PlaceholderPage title="Pengaturan" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;