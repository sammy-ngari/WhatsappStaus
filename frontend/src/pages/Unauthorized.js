import { Link } from "react-router-dom";

/**
 * Renders a safe unauthorized page without exposing backend permission internals.
 *
 * @returns {import("react").JSX.Element}
 */
export default function Unauthorized() {
  return (
    <div className="container py-5">
      <div className="alert alert-danger">
        <h2 className="h4">Access denied</h2>
        <p className="mb-0">
          Your account does not have permission to access this screen.
          <span className="ms-2">
            <Link to="/">Return to home</Link>
          </span>
        </p>
      </div>
    </div>
  );
}
