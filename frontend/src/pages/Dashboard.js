import { useContext } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { AuthContext } from "../context/AuthContext";
import AdvertiserDashboard from "./dashboard/AdvertiserDashboard";
import AffiliateDashboard from "./dashboard/AffiliateDashboard";

/**
 * Dashboard entry page.
 *
 * Responsibilities:
 * - resolve signed-in user role into dashboard experience type
 * - render shared dashboard layout system
 * - render role-specific onboarding content
 * - surface temporary verification reminder banner
 *
 * @returns {import("react").JSX.Element}
 */
export default function Dashboard() {
  const { hasPermission, user } = useContext(AuthContext);
  const showVerificationReminder = user?.phone_verified === false || user?.email_verified === false;

  /**
   * Resolves dashboard role using available identity attributes with permission fallback.
   * Permission fallback keeps legacy seeded roles functional without requiring user payload shape changes.
   *
   * @returns {"affiliate" | "advertiser"}
   */
  const resolveDashboardRole = () => {
    const roleName = String(
      user?.role || user?.role_name || user?.roleTitle || user?.role_title || ""
    )
      .trim()
      .toLowerCase();
    const roleId = String(user?.role_id || "")
      .trim()
      .toLowerCase();

    if (roleName.includes("advertiser") || roleId.includes("advertiser")) {
      return "advertiser";
    }

    if (roleName.includes("affiliate") || roleId.includes("affiliate")) {
      return "affiliate";
    }

    if (hasPermission("Campaigns", "Overview", "write")) {
      return "advertiser";
    }

    return "affiliate";
  };

  const dashboardRole = resolveDashboardRole();
  const pageTitle = dashboardRole === "advertiser" ? "Advertiser Dashboard" : "Affiliate Dashboard";

  return (
    <DashboardLayout pageTitle={pageTitle} roleType={dashboardRole}>
      {showVerificationReminder ? (
        <div className="dashboard-verification-alert" role="alert">
          Please verify your phone/email to unlock full platform functionality.
        </div>
      ) : null}

      {/* Render onboarding workspace matched to resolved role context. */}
      {dashboardRole === "advertiser" ? <AdvertiserDashboard /> : <AffiliateDashboard />}
    </DashboardLayout>
  );
}
