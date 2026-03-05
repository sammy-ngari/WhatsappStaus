import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

/**
 * DashboardHeader
 *
 * Top bar for dashboard screens.
 *
 * Responsibilities:
 * - show current page title
 * - surface signed-in user display name
 * - expose mobile sidebar toggle
 * - handle logout with redirect to homepage
 *
 * @param {{
 *   pageTitle: string,
 *   onToggleSidebar: () => void
 * }} props - Header title and mobile sidebar action.
 * @returns {import("react").JSX.Element}
 */
export default function DashboardHeader({ pageTitle, onToggleSidebar }) {
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);

  const userDisplayName = user?.firstname || user?.email || "there";

  /**
   * Moves user to public homepage first, then clears server/client session.
   * Navigating first prevents protected-route guard races that can push users to /login.
   *
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    navigate("/", { replace: true });
    await logout();
  };

  return (
    <header className="dashboard-header">
      <div className="d-flex align-items-center gap-2">
        <button
          aria-label="Toggle sidebar"
          className="dashboard-header-mobile-menu"
          onClick={onToggleSidebar}
          type="button"
        >
          <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
            <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" fill="currentColor" />
          </svg>
        </button>

        <div className="dashboard-header-title-wrap">
          <h1 className="dashboard-header-title">{pageTitle}</h1>
          <span className="dashboard-header-subtitle">Welcome back, {userDisplayName}</span>
        </div>
      </div>

      <div className="dashboard-header-actions">
        <button className="btn btn-outline-light btn-sm" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
