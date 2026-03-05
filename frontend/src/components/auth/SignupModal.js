import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { register as registerRequest } from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import SignupForm from "./SignupForm";

/**
 * Flow-aware signup modal container.
 * Responsibilities:
 * - manage registration form state and submission lifecycle
 * - call backend registration endpoint for selected flow
 * - refresh authenticated context after cookie-based login
 * - close modal and navigate to dashboard on success
 * Security considerations:
 * - clears password from memory-backed component state on close
 * - delegates role resolution to backend via constrained `flow` values only
 */

/**
 * Displays and manages signup workflow for affiliate/advertiser landing-page entry points.
 *
 * @param {{
 *   flow: "affiliate" | "advertiser",
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props - Modal visibility, selected flow, and close callback.
 * @returns {import("react").JSX.Element | null} Modal content or null when closed.
 */
export default function SignupModal({ flow, isOpen, onClose }) {
  const navigate = useNavigate();
  const { refreshAuthState } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [othernames, setOthernames] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedFlow = flow === "advertiser" ? "advertiser" : "affiliate";
  const flowLabel = selectedFlow === "advertiser" ? "Advertiser" : "Affiliate";

  /**
   * Resets modal-managed input and transient status state.
   *
   * @returns {void}
   */
  const resetState = () => {
    setEmail("");
    setPassword("");
    setFirstname("");
    setOthernames("");
    setLoading(false);
    setError("");
  };

  /**
   * Handles controlled input updates without exposing mutable object state.
   *
   * @param {string} fieldName - Form field identifier.
   * @param {string} value - New field value.
   * @returns {void}
   */
  const handleFieldChange = (fieldName, value) => {
    if (fieldName === "firstname") {
      setFirstname(value);
      return;
    }

    if (fieldName === "othernames") {
      setOthernames(value);
      return;
    }

    if (fieldName === "email") {
      setEmail(value);
      return;
    }

    if (fieldName === "password") {
      setPassword(value);
    }
  };

  /**
   * Closes modal and clears sensitive state.
   *
   * @returns {void}
   */
  const handleClose = () => {
    if (loading) {
      return;
    }

    resetState();
    onClose?.();
  };

  /**
   * Produces safe user-facing error text from axios/network failures.
   *
   * @param {unknown} error - Caught request error.
   * @returns {string} Actionable user-facing message.
   */
  const resolveErrorMessage = (error) => {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (!error?.response) {
      return "Unable to reach the server. Ensure frontend and backend use the same host (localhost or 127.0.0.1).";
    }

    return "Unable to create your account. Please try again.";
  };

  /**
   * Submits registration data, refreshes auth state, and redirects to dashboard.
   *
   * @param {import("react").FormEvent<HTMLFormElement>} event - Form submit event.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const trimmedOthernames = othernames.trim();

      await registerRequest({
        flow: selectedFlow,
        email: email.trim(),
        password,
        firstname: firstname.trim(),
        ...(trimmedOthernames ? { othernames: trimmedOthernames } : {}),
      });
    } catch (registrationError) {
      setError(resolveErrorMessage(registrationError));
      return;
    } finally {
      setLoading(false);
    }

    setLoading(true);

    try {
      await refreshAuthState();
      resetState();
      onClose?.();
      navigate("/dashboard");
    } catch (authBootstrapError) {
      try {
        await api.post("/auth/refresh");
        await refreshAuthState();
        resetState();
        onClose?.();
        navigate("/dashboard");
      } catch (_refreshError) {
        setError(
          "Your account was created, but automatic login failed. Please use the Login button to continue."
        );
        console.error("Post-registration auth bootstrap failed:", authBootstrapError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-label={`${flowLabel} signup form`}
      aria-modal="true"
      className="homepage-login-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
    >
      <section className="homepage-login-card">
        <div className="homepage-login-header">
          <h3 className="homepage-login-title">Create {flowLabel} Account</h3>
          <button
            aria-label="Close signup form"
            className="homepage-login-close"
            disabled={loading}
            onClick={handleClose}
            type="button"
          >
            &times;
          </button>
        </div>

        <p className="homepage-login-subtitle">
          Complete registration to access your dashboard and platform tools immediately.
        </p>

        <SignupForm
          email={email}
          error={error}
          firstname={firstname}
          flow={selectedFlow}
          loading={loading}
          onCancel={handleClose}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          othernames={othernames}
          password={password}
        />
      </section>
    </div>
  );
}
