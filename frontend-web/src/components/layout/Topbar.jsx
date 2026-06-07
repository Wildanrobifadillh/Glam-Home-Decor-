import { CalendarDays, Clock3, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { sidebarGroups } from "../../constants/sidebarMenu";

function Topbar() {
  const location = useLocation();
  const title = getTopbarTitle(location.pathname);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const dateTimeLabel = useMemo(() => {
    const dateLabel = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now);

    const timeLabel = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

    return {
      dateLabel,
      timeLabel,
    };
  }, [now]);

  return (
    <header className="dashboard-topbar-v3">
      <div className="topbar-v3-left">
        <button type="button" className="topbar-v3-icon-button">
          <Menu size={19} />
        </button>

        <span>{title}</span>
      </div>

      <div className="topbar-v3-actions">
        <div className="topbar-v3-date">
          <div className="topbar-date-section">
            <CalendarDays size={17} />
            <span>{dateTimeLabel.dateLabel}</span>
          </div>

          <div className="topbar-date-divider" />

          <div className="topbar-date-section">
            <Clock3 size={17} />
            <span>{dateTimeLabel.timeLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function getTopbarTitle(pathname) {
  if (pathname === "/dashboard") {
    return "Dashboard";
  }

  const activeGroup = sidebarGroups.find((group) =>
    group.items.some(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
    )
  );

  return activeGroup?.groupLabel || "Dashboard";
}

export default Topbar;