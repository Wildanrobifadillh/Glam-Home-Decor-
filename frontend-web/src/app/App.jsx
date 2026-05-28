import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import LoginPage from "../features/auth/LoginPage.jsx";
import { authStore } from "../features/auth/auth.store.js";
import DashboardPage from "../features/dashboard/DashboardPage.jsx";
import CategoryListPage from "../features/categories/CategoryListPage.jsx";
import SupplierListPage from "../features/suppliers/SupplierListPage.jsx";
import ProductListPage from "../features/products/ProductListPage.jsx";
import CustomerListPage from "../features/customers/CustomerListPage.jsx";
import EmployeeListPage from "../features/employees/EmployeeListPage.jsx";
import InventoryPage from "../features/inventory/InventoryPage.jsx";
import StockHistoryPage from "../features/inventory/StockHistoryPage.jsx";
import StockOpnamePage from "../features/stock-opname/StockOpnamePage.jsx";
import PurchaseListPage from "../features/purchases/PurchaseListPage.jsx";
import PurchaseCreatePage from "../features/purchases/PurchaseCreatePage.jsx";
import PurchaseDetailPage from "../features/purchases/PurchaseDetailPage.jsx";
import PurchaseReportPage from "../features/purchases/PurchaseReportPage.jsx";
import SaleListPage from "../features/sales/SaleListPage.jsx";
import SaleCreatePage from "../features/sales/SaleCreatePage.jsx";
import SaleDetailPage from "../features/sales/SaleDetailPage.jsx";
import SaleReportPage from "../features/sales/SaleReportPage.jsx";
import ReturnListPage from "../features/returns/ReturnListPage.jsx";
import SaleReturnCreatePage from "../features/returns/SaleReturnCreatePage.jsx";
import PurchaseReturnCreatePage from "../features/returns/PurchaseReturnCreatePage.jsx";
import ReceivableListPage from "../features/receivables/ReceivableListPage.jsx";
import PayableListPage from "../features/payables/PayableListPage.jsx";
import CashBankListPage from "../features/cash-bank/CashBankListPage.jsx";
import ExpenseListPage from "../features/expenses/ExpenseListPage.jsx";
import AccountListPage from "../features/accounting/AccountListPage.jsx";
import JournalEntryListPage from "../features/journal-entries/JournalEntryListPage.jsx";
import ReportsPage from "../features/reports/ReportsPage.jsx";
import PayrollListPage from "../features/payroll/PayrollListPage.jsx";
import SettingsPage from "../features/settings/SettingsPage.jsx";

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
    </BrowserRouter>
  );
}

export default App;