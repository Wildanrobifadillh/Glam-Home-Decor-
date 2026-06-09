import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { authStore } from "../features/auth/auth.store.js";

const LoginPage = lazy(() => import("../features/auth/LoginPage.jsx"));
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage.jsx"));
const CategoryListPage = lazy(() => import("../features/categories/CategoryListPage.jsx"));
const SupplierListPage = lazy(() => import("../features/suppliers/SupplierListPage.jsx"));
const ProductListPage = lazy(() => import("../features/products/ProductListPage.jsx"));
const CustomerListPage = lazy(() => import("../features/customers/CustomerListPage.jsx"));
const EmployeeListPage = lazy(() => import("../features/employees/EmployeeListPage.jsx"));
const InventoryPage = lazy(() => import("../features/inventory/InventoryPage.jsx"));
const StockHistoryPage = lazy(() => import("../features/inventory/StockHistoryPage.jsx"));
const StockOpnamePage = lazy(() => import("../features/stock-opname/StockOpnamePage.jsx"));
const PurchaseListPage = lazy(() => import("../features/purchases/PurchaseListPage.jsx"));
const PurchaseCreatePage = lazy(() => import("../features/purchases/PurchaseCreatePage.jsx"));
const PurchaseDetailPage = lazy(() => import("../features/purchases/PurchaseDetailPage.jsx"));
const PurchaseReportPage = lazy(() => import("../features/purchases/PurchaseReportPage.jsx"));
const SaleListPage = lazy(() => import("../features/sales/SaleListPage.jsx"));
const SaleCreatePage = lazy(() => import("../features/sales/SaleCreatePage.jsx"));
const SaleDetailPage = lazy(() => import("../features/sales/SaleDetailPage.jsx"));
const SaleReportPage = lazy(() => import("../features/sales/SaleReportPage.jsx"));
const ReturnListPage = lazy(() => import("../features/returns/ReturnListPage.jsx"));
const SaleReturnCreatePage = lazy(() => import("../features/returns/SaleReturnCreatePage.jsx"));
const PurchaseReturnCreatePage = lazy(() => import("../features/returns/PurchaseReturnCreatePage.jsx"));
const ReceivableListPage = lazy(() => import("../features/receivables/ReceivableListPage.jsx"));
const PayableListPage = lazy(() => import("../features/payables/PayableListPage.jsx"));
const CashBankListPage = lazy(() => import("../features/cash-bank/CashBankListPage.jsx"));
const ExpenseListPage = lazy(() => import("../features/expenses/ExpenseListPage.jsx"));
const AccountListPage = lazy(() => import("../features/accounting/AccountListPage.jsx"));
const JournalEntryListPage = lazy(() => import("../features/journal-entries/JournalEntryListPage.jsx"));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage.jsx"));
const PayrollListPage = lazy(() => import("../features/payroll/PayrollListPage.jsx"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage.jsx"));

function PageLoader() {
  return <div className="page-loading">Memuat...</div>;
}

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
      <Suspense fallback={<PageLoader />}>
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
            path="/sales/create"
            element={
              <ProtectedRoute>
                <SaleCreatePage />
              </ProtectedRoute>
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
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/suppliers" element={<SupplierListPage />} />
            <Route path="/customers" element={<CustomerListPage />} />
            <Route path="/employees" element={<EmployeeListPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/stock-history" element={<StockHistoryPage />} />
            <Route path="/stock-opname" element={<StockOpnamePage />} />
            <Route path="/purchases" element={<PurchaseListPage />} />
            <Route path="/purchases/create" element={<PurchaseCreatePage />} />
            <Route path="/purchases/report" element={<PurchaseReportPage />} />
            <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
            <Route path="/sales" element={<SaleListPage />} />
            <Route path="/sales/report" element={<SaleReportPage />} />
            <Route path="/sales/:id" element={<SaleDetailPage />} />
            <Route path="/returns" element={<ReturnListPage />} />
            <Route path="/returns/sales/create" element={<SaleReturnCreatePage />} />
            <Route path="/returns/purchases/create" element={<PurchaseReturnCreatePage />} />
            <Route path="/receivables" element={<ReceivableListPage />} />
            <Route path="/payables" element={<PayableListPage />} />
            <Route path="/cash-bank-accounts" element={<CashBankListPage />} />
            <Route path="/expenses" element={<ExpenseListPage />} />
            <Route path="/payroll" element={<PayrollListPage />} />
            <Route path="/journal-entries" element={<JournalEntryListPage />} />
            <Route path="/accounting" element={<AccountListPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;