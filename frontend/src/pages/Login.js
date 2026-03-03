import { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * Basic login page tied to AuthContext.
 * Collects credentials and shows API validation/authentication errors.
 */
export default function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    
    /**
     * Submit credentials to backend auth endpoint through context action.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await login(email, password);
            const nextPath = location.state?.from?.pathname || "/dashboard";
            navigate(nextPath, { replace: true });
        } catch (err) {
            const message = err?.response?.data?.message || "Unable to login. Please try again.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-6 col-lg-4">
                    <h2 className="mb-4">Login</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                                className="form-control"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <input
                                className="form-control"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <div className="alert alert-danger py-2">{error}</div>}
                        <button className="btn btn-primary w-100" disabled={submitting} type="submit">
                            {submitting ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
