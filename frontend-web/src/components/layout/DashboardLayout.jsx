import { Outlet, useLocation } from "react-router-dom";

import { authStore } from "../../features/auth/auth.store";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function DashboardLayout() {
  const user = authStore.getUser();
  const location = useLocation();

  return (
    <div className="dashboard-shell-v3">
      <Sidebar user={user} />

      <div className="dashboard-main-v3">
        <Topbar user={user} />

        <main className="dashboard-content-v3">
          <div key={location.pathname} className="page-route-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;