import React, { useState } from "react";
import { CheckCircle, Home, Download, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import welcome from "../assets/welcome.jpeg";

const Success = () => {
  const navigate = useNavigate();
  const [voteRef] = useState(
    () => "PANS-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
  );

  return (
    <div
      className="success-page"
      style={{ backgroundImage: `url(${welcome})` }}
    >
      <div className="success-overlay">
        <div className="success-card">
          <div className="success-icon-wrapper">
            <CheckCircle size={60} color="#10b981" strokeWidth={3} />
          </div>

          <h1 className="success-title">VOTE SUBMITTED</h1>
          <p className="success-subtitle">
            Thank you for participating in the 2026 PANS UNIZIK Elections.
          </p>

          <div className="receipt-section">
            <div className="receipt-row">
              <span>Status</span>
              <span className="status-pill">Successful</span>
            </div>
            <div className="receipt-row">
              <span>Reference</span>
              <span className="ref-text">{voteRef}</span>
            </div>
            <div className="receipt-row">
              <span>Timestamp</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="success-actions">
            <button className="primary-button" onClick={() => navigate("/")}>
              <Home size={18} /> FINISH & LOGOUT
            </button>
            <button className="secondary-button" onClick={() => window.print()}>
              <Download size={18} /> PRINT RECEIPT
            </button>
          </div>

          <p className="security-footer">
            A secure record of your vote has been logged against your
            Registration Number.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;
