import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";

/**
 * Blocks route rendering until authentication bootstrap completes and user is authenticated.
 * Redirects unauthenticated users to login while preserving the original destination for post-login navigation.
 *
 * @param {{ children: import("react").ReactNode }} props - Protected route content.
 * @returns {import("react").JSX.Element}
 */
export const RequireAuth = ({ children }) => {
  const { user, isBootstrapping } = useContext(AuthContext);
  const location = useLocation();

  if (isBootstrapping) {
    return <div className="p-4 text-center">Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

/**
 * Prevents unauthorized UI screens from rendering when a required permission is missing.
 * Server-side middleware remains authoritative; this guard exists to improve UX and reduce accidental exposure.
 *
 * @param {{
 *   children: import("react").ReactNode,
 *   moduleName: string,
 *   tabName: string,
 *   action: string
 * }} props - Permission constraint and protected content.
 * @returns {import("react").JSX.Element}
 */
export const RequirePermission = ({ children, moduleName, tabName, action }) => {
  const { hasPermission, isBootstrapping, user } = useContext(AuthContext);

  if (isBootstrapping) {
    return <div className="p-4 text-center">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(moduleName, tabName, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
