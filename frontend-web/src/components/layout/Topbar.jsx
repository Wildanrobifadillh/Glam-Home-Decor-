import { Bell, CalendarDays, Menu } from "lucide-react";

function Topbar() {
  return (
    <header className="dashboard-topbar-v3">
      <div className="topbar-v3-left">
        <button type="button" className="topbar-v3-icon-button">
          <Menu size={19} />
        </button>
        <span>Dashboard</span>
      </div>

      <div className="topbar-v3-actions">
        <button type="button" className="topbar-v3-notification">
          <Bell size={19} />
          <span>3</span>
        </button>

        <button type="button" className="topbar-v3-date">
          <CalendarDays size={17} />
          <span>22 Mei 2025</span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;