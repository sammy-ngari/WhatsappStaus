/**
 * Signup form UI for flow-specific account registration.
 * Responsibilities:
 * - render validated registration fields
 * - expose controlled-input events to parent modal state
 * - keep submit/cancel actions explicit and accessible
 * Security considerations:
 * - password field uses masked input and disabled states during submission
 * - no role selector is exposed to prevent client-side role escalation attempts
 */

/**
 * Renders registration fields used by both affiliate and advertiser entry points.
 *
 * @param {{
 *   flow: "affiliate" | "advertiser",
 *   email: string,
 *   password: string,
 *   firstname: string,
 *   othernames: string,
 *   loading: boolean,
 *   error: string,
 *   onCancel: () => void,
 *   onFieldChange: (fieldName: string, value: string) => void,
 *   onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void
 * }} props - Form view model and action handlers.
 * @returns {import("react").JSX.Element} Registration form element.
 */
export default function SignupForm({
  flow,
  email,
  password,
  firstname,
  othernames,
  loading,
  error,
  onCancel,
  onFieldChange,
  onSubmit,
}) {
  const flowLabel = flow === "advertiser" ? "advertiser" : "affiliate";

  return (
    <form onSubmit={onSubmit}>
      <div className="homepage-login-group">
        <label className="homepage-login-label" htmlFor={`signup-${flowLabel}-firstname`}>
          First Name
        </label>
        <input
          className="homepage-login-input"
          disabled={loading}
          id={`signup-${flowLabel}-firstname`}
          name="firstname"
          onChange={(event) => onFieldChange("firstname", event.target.value)}
          required
          type="text"
          value={firstname}
        />
      </div>

      <div className="homepage-login-group">
        <label className="homepage-login-label" htmlFor={`signup-${flowLabel}-othernames`}>
          Other Names
        </label>
        <input
          className="homepage-login-input"
          disabled={loading}
          id={`signup-${flowLabel}-othernames`}
          name="othernames"
          onChange={(event) => onFieldChange("othernames", event.target.value)}
          type="text"
          value={othernames}
        />
      </div>

      <div className="homepage-login-group">
        <label className="homepage-login-label" htmlFor={`signup-${flowLabel}-email`}>
          Email
        </label>
        <input
          autoComplete="email"
          className="homepage-login-input"
          disabled={loading}
          id={`signup-${flowLabel}-email`}
          name="email"
          onChange={(event) => onFieldChange("email", event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="homepage-login-group">
        <label className="homepage-login-label" htmlFor={`signup-${flowLabel}-password`}>
          Password
        </label>
        <input
          autoComplete="new-password"
          className="homepage-login-input"
          disabled={loading}
          id={`signup-${flowLabel}-password`}
          minLength={8}
          name="password"
          onChange={(event) => onFieldChange("password", event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {error ? <p className="homepage-login-error">{error}</p> : null}

      <div className="homepage-login-actions">
        <button
          className="btn btn-outline"
          disabled={loading}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}
