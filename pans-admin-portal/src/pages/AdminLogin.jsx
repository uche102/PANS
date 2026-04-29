import React, { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import panslogo from "../assets/IMG-20260410-WA0090.jpg";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const API_BASE = "http://localhost:8000";

  const handleSubmit = async (e) => {
    e.preventDefault(); // VERY IMPORTANT
    setError(false);

    try {
      const response = await fetch(`${API_BASE}/api/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "pans_admin",
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("adminToken", data.token);
        navigate("/dashboard");
      } else {
        setError(true);
        setTimeout(() => setError(false), 3000);
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError(true);
    }
  };

  return (
    <div className="admin-login-screen">
      <div className="login-panel">
        <div className="security-header">
          <div className="brand-icon">
            <img
              src={panslogo}
              alt="PANS UNIZIK Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <h2>Directorate Access</h2>
          <p>PANS UNIZIK Election</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="auth-input-group">
            <label>Security Access Key</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter Access Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="error-text">Invalid Access Key. Attempt logged.</p>
          )}

          <button type="submit" className="admin-login-btn">
            AUTHORIZE SESSION <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
