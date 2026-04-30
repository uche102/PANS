import { ArrowLeft, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import liberty from "../assets/liberty.jpeg";
import pansLogo from "../assets/IMG-20260410-WA0090.jpg";
import { api } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState("reg");
  const [regNo, setRegNo] = useState("");
  const [otp, setOtp] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp() {
    setError("");
    if (!regNo.trim()) {
      setError("Enter your registration number.");
      return;
    }

    try {
      setLoading(true);
      const data = await api.requestOtp(regNo.trim().toUpperCase());
      setSentTo(data.sentTo);
      setDevOtp(data.devOtp || "");
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    try {
      setLoading(true);
      const data = await api.verifyOtp(regNo.trim().toUpperCase(), otp);
      sessionStorage.setItem("pansVoter", JSON.stringify(data.voter));
      if (data.token) {
        sessionStorage.setItem("pansVoterToken", data.token);
      }
      navigate("/ballot");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" style={{ backgroundImage: `url(${liberty})` }}>
      <div className="page-scrim">
        <section className="login-panel" aria-label="PANS UniZik voter login">
          <img src={pansLogo} alt="PANS UniZik logo" className="login-logo" />
          <h1>PANS UniZik</h1>
          <p>Election voting portal</p>

          {step === "reg" ? (
            <div className="form-stack">
              <label>
                <span>Registration Number</span>
                <div className="field">
                  <User size={18} />
                  <input
                    value={regNo}
                    onChange={(event) => setRegNo(event.target.value.toUpperCase())}
                    placeholder="Enter your reg no"
                    autoComplete="username"
                  />
                </div>
              </label>
              {error && <p className="error-text">{error}</p>}
              <button className="primary-button" disabled={loading} onClick={requestOtp}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          ) : (
            <form className="form-stack" onSubmit={verifyOtp}>
              <div className="notice">
                <Mail size={18} />
                <span>OTP sent to {sentTo}</span>
              </div>
              {devOtp && (
                <div className="notice warning">
                  <span>Local test OTP: {devOtp}</span>
                </div>
              )}
              <label>
                <span>OTP Code</span>
                <div className="field">
                  <Lock size={18} />
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>
              </label>
              {error && <p className="error-text">{error}</p>}
              <button className="primary-button" disabled={loading}>
                {loading ? "Verifying..." : "Login to Vote"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setStep("reg");
                  setOtp("");
                  setDevOtp("");
                  setError("");
                }}
              >
                <ArrowLeft size={16} />
                Change registration number
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
