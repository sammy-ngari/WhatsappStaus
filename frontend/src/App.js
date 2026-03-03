import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import { RequireAuth, RequirePermission } from "./context/AuthGuards";

/**
 * Application router with authentication and permission guards.
 *
 * @returns {import("react").JSX.Element}
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <RequirePermission moduleName="Campaigns" tabName="Overview" action="read">
              <Dashboard />
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
