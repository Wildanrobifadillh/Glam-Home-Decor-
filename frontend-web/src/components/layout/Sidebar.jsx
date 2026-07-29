import { LogOut, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import logoGlamHd from "../../assets/images/logo-glam-hd.png";
import { BRAND } from "../../constants/brand";
import {
  getAllowedModuleKeysByRole,
  getSidebarFooterItemsByModuleKeys,
  getSidebarFooterItemsByRole,
  getSidebarGroupsByModuleKeys,
  getSidebarGroupsByRole,
} from "../../constants/sidebarMenu";
import { authStore } from "../../features/auth/auth.store";
import { settingsApi } from "../../features/settings/settings.api";

function Sidebar({ user }) {
  const [search, setSearch] = useState("");
  const [permissionModuleKeys, setPermissionModuleKeys] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMyPermissions = async () => {
      if (!user?.role) {
        return;
      }

      if (user.role === "OWNER") {
        setPermissionModuleKeys(getAllowedModuleKeysByRole(user.role));
        return;
      }

      try {
        const response = await settingsApi.getMyPermissions();
        const responseData = response.data?.data || response.data;
        const myPermissions =
          responseData?.myPermissions || responseData?.rolePermissions || responseData;

        const allowedModuleKeys =
          myPermissions?.permissions
            ?.filter((permission) => permission.canAccess)
            .map((permission) => permission.key) || [];

        if (isMounted) {
          setPermissionModuleKeys(
            allowedModuleKeys.length > 0
              ? allowedModuleKeys
              : getAllowedModuleKeysByRole(user.role)
          );
        }
      } catch {
        if (isMounted) {
          setPermissionModuleKeys(getAllowedModuleKeysByRole(user.role));
        }
      }
    };

    fetchMyPermissions();

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const groups = permissionModuleKeys
    ? getSidebarGroupsByModuleKeys(permissionModuleKeys)
    : getSidebarGroupsByRole(user?.role);

  const footerItems = permissionModuleKeys
    ? getSidebarFooterItemsByModuleKeys(permissionModuleKeys)
    : getSidebarFooterItemsByRole(user?.role);

  const visibleGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(keyword)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const handleLogout = () => {
    authStore.logout();
    window.location.href = "/login";
  };

  return (
    <aside className="dashboard-sidebar-v3">
      <div className="sidebar-v3-brand">
        <img src={logoGlamHd} alt={BRAND.name} />
      </div>

      <div className="sidebar-v3-search">
        <Search size={15} />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari menu, stok, laporan..."
        />
      </div>

      <nav className="sidebar-v3-menu">
        {visibleGroups.map((group) => (
          <section key={group.groupLabel} className="sidebar-v3-group">
            <div className="sidebar-v3-group-header">
              <span>{group.groupLabel}</span>
            </div>

            <div className="sidebar-v3-grid">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.moduleKey}
                    to={item.path}
                    className={({ isActive }) =>
                      isActive
                        ? "sidebar-v3-item is-active"
                        : "sidebar-v3-item"
                    }
                  >
                    <Icon size={22} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-v3-bottom">
        {footerItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.moduleKey}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? "sidebar-v3-utility is-active"
                  : "sidebar-v3-utility"
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button type="button" className="sidebar-v3-utility" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>

        <div className="sidebar-v3-profile">
          <div className="sidebar-v3-avatar">{getInitial(user?.name)}</div>

          <div>
            <h2>{getDisplayName(user)}</h2>
            <p>{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function getInitial(name) {
  if (!name) {
    return "U";
  }

  return name.charAt(0).toUpperCase();
}

function getRoleLabel(role) {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN_STAFF") return "Admin Staff";
  if (role === "STAFF_GUDANG") return "Staff Gudang";

  return role || "-";
}

function getDisplayName(user) {
  return user?.name || user?.username || "User";
}

export default Sidebar;