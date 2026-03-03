import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Protected dashboard screen with permission-aware UI sections.
 * Sensitive controls are hidden when missing permission, but server RBAC still enforces true access control.
 *
 * @returns {import("react").JSX.Element}
 */
export default function Dashboard() {
  const { user, hasPermission, logout } = useContext(AuthContext);

  const canViewOverview = hasPermission("Campaigns", "Overview", "read");
  const canManageCampaigns = hasPermission("Campaigns", "Overview", "write");

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 mb-0">Campaign Dashboard</h1>
          <small className="text-muted">
            Signed in as {user?.firstname || user?.email}
          </small>
        </div>
        <button className="btn btn-outline-secondary" onClick={logout} type="button">
          Logout
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {canViewOverview ? (
            <p className="mb-3">Overview metrics and campaign summaries are available for your role.</p>
          ) : (
            <p className="mb-3 text-danger">
              You do not have permission to view Campaign Overview data.
            </p>
          )}

          {canManageCampaigns && (
            <button className="btn btn-primary" type="button">
              Create Campaign
            </button>
          )}

          {!canManageCampaigns && (
            <div className="alert alert-warning mt-2 mb-0 py-2">
              Campaign creation is hidden because your role lacks <code>Campaigns/Overview/write</code>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
