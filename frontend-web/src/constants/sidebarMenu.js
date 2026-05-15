import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

export const sidebarGroups = [
  {
    groupLabel: "Umum",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        moduleKey: "dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupLabel: "Master Data",
    items: [
      {
        label: "Kategori",
        path: "/categories",
        moduleKey: "categories",
        icon: ClipboardList,
      },
      {
        label: "Barang",
        path: "/products",
        moduleKey: "products",
        icon: Package,
      },
      {
        label: "Supplier",
        path: "/suppliers",
        moduleKey: "suppliers",
        icon: Truck,
      },
      {
        label: "Pelanggan",
        path: "/customers",
        moduleKey: "customers",
        icon: Users,
      },
      {
        label: "Karyawan",
        path: "/employees",
        moduleKey: "employees",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    groupLabel: "Stok",
    items: [
      {
        label: "Inventory",
        path: "/inventory",
        moduleKey: "inventory",
        icon: Boxes,
      },
      {
        label: "Histori Stok",
        path: "/stock-history",
        moduleKey: "stock_history",
        icon: BarChart3,
      },
      {
        label: "Stock Opname",
        path: "/stock-opname",
        moduleKey: "stock_opname",
        icon: ClipboardList,
      },
    ],
  },
  {
    groupLabel: "Transaksi",
    items: [
      {
        label: "Pembelian",
        path: "/purchases",
        moduleKey: "purchases",
        icon: Truck,
      },
      {
        label: "Penjualan",
        path: "/sales",
        moduleKey: "sales",
        icon: ShoppingCart,
      },
      {
        label: "Retur",
        path: "/returns",
        moduleKey: "sale_returns",
        icon: RefreshCcw,
      },
    ],
  },
  {
    groupLabel: "Keuangan",
    items: [
      {
        label: "Piutang",
        path: "/receivables",
        moduleKey: "receivables",
        icon: ReceiptText,
      },
      {
        label: "Hutang",
        path: "/payables",
        moduleKey: "payables",
        icon: ClipboardList,
      },
      {
        label: "Payroll",
        path: "/payroll",
        moduleKey: "payroll",
        icon: CreditCard,
      },
    ],
  },
  {
    groupLabel: "Akuntansi",
    items: [
      {
        label: "Jurnal",
        path: "/journal-entries",
        moduleKey: "journal_entries",
        icon: ReceiptText,
      },
      {
        label: "Akun Perkiraan",
        path: "/accounting",
        moduleKey: "accounting",
        icon: Landmark,
      },
    ],
  },
  {
    groupLabel: "Laporan",
    items: [
      {
        label: "Laporan",
        path: "/reports",
        moduleKey: "reports",
        icon: FileBarChart,
      },
    ],
  },
];

export const sidebarFooterItems = [
  {
    label: "Pengaturan",
    path: "/settings",
    moduleKey: "settings",
    icon: Settings,
  },
];

export const roleDefaultModuleKeys = {
  OWNER: [
    "dashboard",
    "categories",
    "products",
    "suppliers",
    "customers",
    "employees",
    "inventory",
    "stock_history",
    "stock_opname",
    "purchases",
    "sales",
    "sale_returns",
    "purchase_returns",
    "receivables",
    "payables",
    "expenses",
    "payroll",
    "accounting",
    "journal_entries",
    "reports",
    "settings",
  ],
  ADMIN_STAFF: [
    "dashboard",
    "categories",
    "products",
    "suppliers",
    "customers",
    "employees",
    "purchases",
    "sales",
    "sale_returns",
    "purchase_returns",
    "receivables",
    "payables",
    "expenses",
    "reports",
  ],
  STAFF_GUDANG: [
    "dashboard",
    "products",
    "inventory",
    "stock_history",
    "stock_opname",
    "sale_returns",
    "purchase_returns",
  ],
};

export const getAllowedModuleKeysByRole = (role) => {
  return roleDefaultModuleKeys[role] || roleDefaultModuleKeys.STAFF_GUDANG;
};

export const getSidebarGroupsByRole = (role) => {
  const allowedModuleKeys = getAllowedModuleKeysByRole(role);

  return sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        allowedModuleKeys.includes(item.moduleKey)
      ),
    }))
    .filter((group) => group.items.length > 0);
};

export const getSidebarFooterItemsByRole = (role) => {
  const allowedModuleKeys = getAllowedModuleKeysByRole(role);

  return sidebarFooterItems.filter((item) =>
    allowedModuleKeys.includes(item.moduleKey)
  );
};