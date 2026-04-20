import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {  Mail, ArrowLeft } from "lucide-react";
import panslogo from "../assets/IMG-20260410-WA0090.jpg";
import libertyImg from "../assets/liberty.jpeg";
const Login = () => {
  const [step, setStep] = useState(1);
  const [regNumber, setRegNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [maskedEmail, setMaskedEmail] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo: regNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setMaskedEmail(data.send); // masked email from backend
        setStep(2);
      } else {
        alert(data.error || "Student not found");
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert("Server error. Is your backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regNo: regNumber, // Backend will use this to find the correct OTP record
          userCode: otp,
        }),
      });

      if (response.ok) {
        // Store verification status if needed, then move to ballot
        navigate("/otp", { state: { voterId: regNumber } });
      } else {
        const data = await response.json();
        alert(data.message || "Invalid OTP");
      }

      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      alert("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* This is the main full-screen container with the background image */
    <div
      className="login-page"
      style={{ backgroundImage: `url(${libertyImg})` }}
    >
      <div className="login-card">
        {/* Faculty Branding */}
        <div className="brand-section">
          <div className="brand-icon">
            <img
              src={panslogo}
              alt="PANS UNIZIK Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <h1 className="brand-title">PANS UNIZIK</h1>
          <p className="brand-subtitle">Voter Verification Portal</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="login-form">
            <div className="input-group">
              <label className="input-label">Registration Number</label>
              <input
                type="text"
                placeholder="20XX/XXXXXX"
                className="text-input"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                required
              />
            </div>
            <button disabled={loading} className="primary-button">
              {loading ? "Verifying..." : "GENERATE OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="login-form">
            <div className="otp-info">
              <Mail size={20} color="var(--accent)" />
              <p>
                OTP sent to{" "}
                <span className="highlight-text">{maskedEmail}</span>
              </p>
            </div>
            <input
              type="text"
              placeholder="0 0 0 0 0 0"
              className="otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
            <button disabled={loading} className="primary-button">
              {loading ? "Authenticating..." : "CAST MY VOTE"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="back-button"
            >
              <ArrowLeft size={14} /> EDIT REGISTRATION NUMBER
            </button>
          </form>
        )}

        <div className="footer-note">
          <p>PANS • 2026 Election</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
