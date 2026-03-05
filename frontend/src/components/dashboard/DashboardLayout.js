import { useCallback, useState } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import "./dashboard.css";

/**
 * DashboardLayout
 *
 * Provides the core dashboard structure.
 *
 * Responsibilities:
 * - render fixed sidebar navigation
 * - render sticky dashboard header
 * - wrap role-specific page content
 * - coordinate mobile sidebar toggle state
 *
 * @param {{
 *   pageTitle: string,
 *   roleType: "affiliate" | "advertiser",
 *   children: import("react").ReactNode
 * }} props - Layout title, role-aware navigation mode, and page body.
 * @returns {import("react").JSX.Element}
 */
export default function DashboardLayout({ pageTitle, roleType, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /**
   * Toggles sidebar visibility for mobile/off-canvas mode.
   *
   * @returns {void}
   */
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((currentValue) => !currentValue);
  }, []);

  /**
   * Closes the sidebar after navigation or backdrop click.
   *
   * @returns {void}
   */
  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div className="dashboard-shell">
      {/* Sidebar remains fixed on desktop and switches to off-canvas on smaller screens. */}
      <DashboardSidebar
        isOpen={isSidebarOpen}
        onNavigate={handleCloseSidebar}
        roleType={roleType}
      />

      <div className="dashboard-main">
        <DashboardHeader
          onToggleSidebar={handleToggleSidebar}
          pageTitle={pageTitle}
        />

        <div className="dashboard-content">{children}</div>
      </div>

      <button
        aria-hidden={!isSidebarOpen}
        aria-label="Close sidebar menu"
        className={`dashboard-sidebar-backdrop ${isSidebarOpen ? "is-visible" : ""}`}
        onClick={handleCloseSidebar}
        type="button"
      />
    </div>
  );
}
