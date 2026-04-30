import { Lock } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import welcome from "../assets/welcome.jpeg";
import { api } from "../lib/api";

const Admin = lazy(() => import("./Admin.jsx"));

export default function AdminGate() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    async function check() {
      const token = sessionStorage.getItem("pansAdminToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await api.adminSession();
        setAuthed(true);
      } catch {
        sessionStorage.removeItem("pansAdminToken");
      } finally {
        setLoading(false);
      }
    }

    check();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      setSubmitting(true);
      const data = await api.adminLogin(password);
      if (data.token) {
        sessionStorage.setItem("pansAdminToken", data.token);
      }
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="loading-screen">Checking admin access...</div>;
  }

  if (!authed) {
    return (
      <div className="login-page" style={{ backgroundImage: `url(${welcome})` }}>
        <div className="page-scrim">
          <form className="login-panel compact" onSubmit={handleSubmit}>
            <Lock size={34} />
            <h1>Admin Access</h1>
            <p>PANS UniZik election control</p>
            <label>
              <span>Admin Password</span>
              <div className="field">
                <Lock size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter admin password"
                />
              </div>
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="primary-button" disabled={submitting}>
              {submitting ? "Checking..." : "Open Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="loading-screen">Loading admin dashboard...</div>}>
      <Admin />
    </Suspense>
  );
}
