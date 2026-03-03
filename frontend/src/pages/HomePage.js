import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./HomePage.css";

const HOMEPAGE_DOCUMENT_PATH = "/WhatsApp%20Status%20Business%20Platform.html";

/**
 * Renders the business platform HTML document as the app landing page.
 * Authentication is exposed via a closable overlay so the marketing homepage remains visible until login is needed.
 *
 * @returns {import("react").JSX.Element}
 */
export default function HomePage() {
  const iframeRef = useRef(null);
  const navigate = useNavigate();
  const { isBootstrapping, login, logout, user } = useContext(AuthContext);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Opens the login modal and resets stale error state from previous attempts.
   *
   * @returns {void}
   */
  const openLoginOverlay = () => {
    setErrorMessage("");
    setShowLoginOverlay(true);
  };

  /**
   * Closes the login modal and clears sensitive input values from memory-backed component state.
   *
   * @returns {void}
   */
  const closeLoginOverlay = () => {
    setShowLoginOverlay(false);
    setErrorMessage("");
    setPassword("");
  };

  /**
   * Authenticates credentials through server-side cookie auth and redirects to the protected dashboard.
   *
   * @param {import("react").FormEvent<HTMLFormElement>} event - Browser form submit event.
   * @returns {Promise<void>}
   */
  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      await login(email, password);
      closeLoginOverlay();
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to login. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) {
      return undefined;
    }

    let removeButtonListener = () => {};

    const wireHeaderLoginButton = () => {
      try {
        const frameDocument = frame.contentDocument;
        if (!frameDocument) {
          return;
        }

        const headerLoginButton = frameDocument.querySelector("header .nav > button.btn.btn-outline");
        if (!headerLoginButton) {
          return;
        }

        headerLoginButton.textContent = user ? "Dashboard" : "Login";
        headerLoginButton.type = "button";

        const onHeaderLoginClick = (event) => {
          event.preventDefault();
          if (user) {
            navigate("/dashboard");
            return;
          }

          openLoginOverlay();
        };

        headerLoginButton.addEventListener("click", onHeaderLoginClick);
        removeButtonListener = () => {
          headerLoginButton.removeEventListener("click", onHeaderLoginClick);
        };
      } catch (_error) {
        // If iframe content is not accessible, keep page functional without the login bridge.
      }
    };

    const onFrameLoad = () => {
      removeButtonListener();
      removeButtonListener = () => {};
      wireHeaderLoginButton();
    };

    frame.addEventListener("load", onFrameLoad);
    wireHeaderLoginButton();

    return () => {
      frame.removeEventListener("load", onFrameLoad);
      removeButtonListener();
    };
  }, [navigate, user]);

  return (
    <main className="homepage-shell">
      <iframe
        ref={iframeRef}
        className="homepage-document-frame"
        src={HOMEPAGE_DOCUMENT_PATH}
        title="WhatsApp Status Business Platform"
      />

      {showLoginOverlay && (
        <div
          className="homepage-login-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLoginOverlay();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Login form"
        >
          <section
            className="homepage-login-card"
          >
            <div className="homepage-login-header">
              <h3 className="homepage-login-title">Welcome back</h3>
              <button
                aria-label="Close login form"
                className="homepage-login-close"
                onClick={closeLoginOverlay}
                type="button"
              >
                &times;
              </button>
            </div>
            <p className="homepage-login-subtitle">
              Sign in to continue to your dashboard and campaign workspace.
            </p>

            <form onSubmit={handleLoginSubmit}>
              <div className="homepage-login-group">
                <label className="homepage-login-label" htmlFor="overlay-email">
                  Email
                </label>
                <input
                  className="homepage-login-input"
                  disabled={isBootstrapping}
                  id="overlay-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="homepage-login-group">
                <label className="homepage-login-label" htmlFor="overlay-password">
                  Password
                </label>
                <input
                  className="homepage-login-input"
                  disabled={isBootstrapping}
                  id="overlay-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>

              {errorMessage && <p className="homepage-login-error">{errorMessage}</p>}

              <div className="homepage-login-actions">
                {user ? (
                  <button
                    className="btn btn-outline"
                    onClick={logout}
                    type="button"
                  >
                    Logout
                  </button>
                ) : null}
                <button className="btn btn-primary" disabled={submitting || isBootstrapping} type="submit">
                  {submitting ? "Signing in..." : "Login"}
                </button>
              </div>
            </form>

            {user ? (
              <div className="homepage-login-dashboard-link">
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate("/dashboard")}
                  type="button"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : null}

            {isBootstrapping && (
              <p className="homepage-login-subtitle">Checking your current session...</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
