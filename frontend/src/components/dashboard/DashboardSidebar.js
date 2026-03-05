import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

/**
 * Sidebar icon renderer.
 * Keeps icon usage centralized so menu definitions remain focused on navigation structure.
 *
 * @param {{ name: string }} props - Icon identifier.
 * @returns {import("react").JSX.Element}
 */
const SidebarIcon = ({ name }) => {
  const iconMap = {
    dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
    campaigns: "M4 6h16v2H4V6Zm0 5h10v2H4v-2Zm0 5h16v2H4v-2Z",
    earnings: "M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 15.93V19h-2v-1.1a4.12 4.12 0 0 1-3-1.7l1.54-1.26a2.25 2.25 0 0 0 1.88.9c1.12 0 1.88-.56 1.88-1.37s-.56-1.29-2.05-1.75c-1.91-.59-3.24-1.28-3.24-3.08a3.14 3.14 0 0 1 2.81-3.02V5h2v1.12a3.68 3.68 0 0 1 2.54 1.31l-1.47 1.25a2.18 2.18 0 0 0-1.63-.64c-.97 0-1.56.53-1.56 1.24 0 .77.65 1.13 2.17 1.63 2.07.66 3.14 1.57 3.14 3.2a3.24 3.24 0 0 1-2.71 3.22Z",
    referrals: "M16 11c1.66 0 2.99-1.57 2.99-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Zm-8 0c1.66 0 2.99-1.57 2.99-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.94 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z",
    settings: "M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.49.49 0 0 0-.49-.42h-3.84a.49.49 0 0 0-.49.42l-.36 2.54a7.03 7.03 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.05.72 1.63.94l.36 2.54a.49.49 0 0 0 .49.42h3.84a.49.49 0 0 0 .49-.42l.36-2.54c.58-.22 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z",
    organizations: "M3 21h18v-2H3v2Zm2-4h4V7H5v10Zm5 0h4V3h-4v14Zm5 0h4v-7h-4v7Z",
    brands: "m12 2 9 4-9 4-9-4 9-4Zm7 7.2V14c0 3-3.13 5.5-7 5.5S5 17 5 14V9.2l7 3.1 7-3.1Z",
    analytics: "M5 9h3v10H5V9Zm5-4h3v14h-3V5Zm5 7h3v7h-3v-7Z",
  };

  return (
    <svg aria-hidden="true" className="dashboard-sidebar-item-icon" viewBox="0 0 24 24">
      <path d={iconMap[name] || iconMap.dashboard} fill="currentColor" />
    </svg>
  );
};

const ROLE_MENU_ITEMS = Object.freeze({
  affiliate: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { key: "campaigns", label: "Campaigns", icon: "campaigns" },
    { key: "earnings", label: "Earnings", icon: "earnings" },
    { key: "referrals", label: "Referrals", icon: "referrals" },
    { key: "settings", label: "Settings", icon: "settings" },
  ],
  advertiser: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { key: "organizations", label: "Organizations", icon: "organizations" },
    { key: "brands", label: "Brands", icon: "brands" },
    { key: "campaigns", label: "Campaigns", icon: "campaigns" },
    { key: "analytics", label: "Analytics", icon: "analytics" },
    { key: "settings", label: "Settings", icon: "settings" },
  ],
});

/**
 * DashboardSidebar
 *
 * Role-aware sidebar navigation for affiliate and advertiser experiences.
 *
 * Responsibilities:
 * - show the correct menu model by user role
 * - highlight active location segment
 * - close mobile sidebar after navigation actions
 *
 * @param {{
 *   roleType: "affiliate" | "advertiser",
 *   isOpen: boolean,
 *   onNavigate: () => void
 * }} props - Role mode and mobile drawer handlers.
 * @returns {import("react").JSX.Element}
 */
export default function DashboardSidebar({ roleType, isOpen, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const menuItems = ROLE_MENU_ITEMS[roleType] || ROLE_MENU_ITEMS.affiliate;
  const locationSegment = String(location.pathname || "")
    .split("/")
    .filter(Boolean)[1];

  /**
   * Determines active item state from the current route path.
   * Route parsing is resilient even when new nested dashboard routes are added later.
   *
   * @param {{ key: string }} item - Sidebar item metadata.
   * @returns {boolean}
   */
  const isActiveItem = (item) => {
    if (item.key === "dashboard" && location.pathname === "/dashboard") {
      return true;
    }

    return locationSegment === item.key;
  };

  /**
   * Navigates only when item path is implemented.
   * Placeholder entries remain visible for roadmap consistency without broken route transitions.
   *
   * @param {{ path?: string }} item - Sidebar item metadata.
   * @returns {void}
   */
  const handleItemSelect = (item) => {
    if (!item.path) {
      return;
    }

    navigate(item.path);
    onNavigate?.();
  };

  return (
    <aside className={`dashboard-sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="dashboard-sidebar-brand">
        <span className="dashboard-sidebar-brand-mark">WA</span>
        WhatsApp Ads Hub
      </div>

      <div className="dashboard-sidebar-role">
        {roleType === "advertiser" ? "Advertiser Workspace" : "Affiliate Workspace"}
      </div>

      <nav aria-label="Dashboard navigation" className="dashboard-sidebar-nav">
        {menuItems.map((item) => (
          <button
            className={`dashboard-sidebar-item ${isActiveItem(item) ? "is-active" : ""} ${item.path ? "" : "is-disabled"}`}
            key={item.key}
            onClick={() => handleItemSelect(item)}
            type="button"
          >
            <SidebarIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="dashboard-sidebar-role mt-4">
        Signed in as {user?.firstname || user?.email || "User"}
      </div>
    </aside>
  );
}
