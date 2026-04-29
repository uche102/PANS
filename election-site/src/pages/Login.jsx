import React, { useState } from "react";
import { User, Lock, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import pansLogo from "../assets/IMG-20260410-WA0090.jpg";
import welcome from "../assets/welcome.jpeg";

const Login = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [regNumber, setRegNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isTestMode, setIsTestMode] = useState(false);
  const API_BASE = "http://localhost:8000";

  const handleSendOTP = async () => {
    setErrorMessage("");

    if (!regNumber.trim()) {
      setErrorMessage("Please enter your registration number.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:8000/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ regNo: regNumber.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMaskedPhone(data.sentTo);
        setIsTestMode(!!data.testMode);
        setStep(2);
      } else {
        setErrorMessage(data.error || "Student not found.");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      setErrorMessage("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!otp.trim()) {
      setErrorMessage("Please enter your verification code.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:8000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regNo: regNumber.trim(),
          userCode: otp.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("voterRegNo", regNumber.trim());
        navigate("/ballot", { state: { voterId: regNumber.trim() } });
      } else {
        setErrorMessage(data.message || "Invalid verification code.");
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setErrorMessage("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${welcome})` }}>
      <div className="overlay">
        <div className="login-card">
          <div className="logo-section">
            <img src={pansLogo} alt="PANS Logo" className="pans-logo" />
            <h1>PANS E-VOTING PORTAL</h1>
            <p>Secure, Easy & Transparent Elections</p>
          </div>

          {step === 1 ? (
            <div className="login-form">
              <div className="input-group">
                <label className="input-label">Registration Number</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="20XX/XXXXXX"
                    className="text-input"
                    value={regNumber}
                    onChange={(e) => {
                      setRegNumber(e.target.value.toUpperCase());
                      if (errorMessage) setErrorMessage("");
                    }}
                    required
                  />
                </div>
                {errorMessage && <p className="form-error">{errorMessage}</p>}
              </div>

              <button
                type="button"
                disabled={loading}
                className="primary-button"
                onClick={handleSendOTP}
              >
                {loading ? "Sending OTP..." : "GENERATE OTP"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOTP} className="login-form">
              <div className="otp-info">
                <Mail size={20} color="var(--accent)" />
                <p>
                  OTP sent to{" "}
                  <span className="highlight-text">{maskedPhone}</span>
                </p>
              </div>

              {isTestMode && (
                <p className="test-mode-note">
                  Test mode is active. Ask the administrator for the
                  verification code shown in the backend terminal.
                </p>
              )}

              <div className="input-group">
                <label className="input-label">Verification Code</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="000000"
                    className="text-input"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ""));
                      if (errorMessage) setErrorMessage("");
                    }}
                    maxLength={6}
                    required
                  />
                </div>
                {errorMessage && <p className="form-error">{errorMessage}</p>}
              </div>

              <button disabled={loading} className="primary-button">
                {loading ? "Authenticating..." : "CAST MY VOTE"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setMaskedPhone("");
                  setErrorMessage("");
                  setIsTestMode(false);
                }}
                className="back-button"
              >
                <ArrowLeft size={14} /> EDIT REGISTRATION NUMBER
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
