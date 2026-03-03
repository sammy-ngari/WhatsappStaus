import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

/**
 * Auth context exposes authenticated identity state, permission state, and auth actions.
 */
export const AuthContext = createContext();

/**
 * Provides app-wide authentication and permission state backed by secure HttpOnly-cookie sessions.
 * The provider never stores tokens in browser-readable storage to reduce token theft impact from XSS.
 *
 * @param {{ children: import("react").ReactNode }} props - React children to receive auth context.
 * @returns {import("react").JSX.Element} Context provider wrapper.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  /**
   * Clears local auth state after hard auth failures.
   *
   * @returns {void}
   */
  const resetAuthState = useCallback(() => {
    setUser(null);
    setPermissions([]);
  }, []);

  /**
   * Loads current authenticated user and normalized permissions from server-owned context.
   *
   * @returns {Promise<void>}
   */
  const refreshAuthState = useCallback(async () => {
    const [meResponse, permissionsResponse] = await Promise.all([
      api.get("/auth/me"),
      api.get("/auth/permissions"),
    ]);

    setUser(meResponse.data?.data?.user || null);
    setPermissions(Array.isArray(permissionsResponse.data?.data?.permissions) ? permissionsResponse.data.data.permissions : []);
  }, []);

  /**
   * Performs credential login and hydrates user/permission state from authoritative backend endpoints.
   *
   * @param {string} email - User email credential.
   * @param {string} password - User password credential.
   * @returns {Promise<void>}
   */
  const login = useCallback(
    async (email, password) => {
      await api.post("/auth/login", { email, password });
      await refreshAuthState();
    },
    [refreshAuthState]
  );

  /**
   * Logs out server-side session and clears in-memory client auth state.
   *
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      resetAuthState();
    }
  }, [resetAuthState]);

  /**
   * Checks whether cached permission descriptors include the required module/tab/action tuple.
   *
   * @param {string} moduleName - Module title expected by backend RBAC records.
   * @param {string} tabName - Tab title expected by backend RBAC records.
   * @param {string} action - Action value expected by backend RBAC records.
   * @returns {boolean} True when the client permission cache contains a matching permission.
   */
  const hasPermission = useCallback(
    (moduleName, tabName, action) => {
      const moduleValue = String(moduleName || "").trim().toLowerCase();
      const tabValue = String(tabName || "").trim().toLowerCase();
      const actionValue = String(action || "").trim().toLowerCase();

      if (!moduleValue || !tabValue || !actionValue) {
        return false;
      }

      return permissions.some((permission) => {
        return (
          String(permission.moduleName || "").trim().toLowerCase() === moduleValue &&
          String(permission.tabName || "").trim().toLowerCase() === tabValue &&
          String(permission.action || "").trim().toLowerCase() === actionValue
        );
      });
    },
    [permissions]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await refreshAuthState();
      } catch (error) {
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
          // Keep noisy server/debug details in console only; UI remains generic.
          console.error("Auth bootstrap failed:", error);
        }
        if (isMounted) {
          resetAuthState();
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [refreshAuthState, resetAuthState]);

  const value = useMemo(
    () => ({
      user,
      permissions,
      isBootstrapping,
      login,
      logout,
      refreshAuthState,
      hasPermission,
    }),
    [hasPermission, isBootstrapping, login, logout, permissions, refreshAuthState, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

