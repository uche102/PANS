const API_BASE = "http://localhost:8000";
import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Users, BarChart3, LogOut, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

// 1. Move authHeader outside the component to prevent re-creation on every render

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [results, setResults] = useState([]);
  const [votersList, setVotersList] = useState([]);

  const syncData = async () => {
    if (!token) return;

    const resultsRes = await fetch(`${API_BASE}/api/results`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const votersRes = await fetch(`${API_BASE}/api/voters`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const resultsData = await resultsRes.json();
    const votersData = await votersRes.json();

    setResults(resultsData);
    setVotersList(votersData.filter((v) => v.status === "Voted"));
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncData();
    const interval = setInterval(syncData, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="brand-section">
          <div className="brand-icon">
            <BarChart3 size={32} />
          </div>
          <h2 className="brand-title">PANS Election</h2>
          <p className="brand-subtitle">Admin Control Panel</p>
        </div>

        <button className="nav-item active">
          <BarChart3 size={18} />
          Dashboard
        </button>

        <button
          className="nav-item"
          onClick={() => {
            localStorage.removeItem("adminToken");
            navigate("/");
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Live election results and voter activity</p>
          </div>

          <div className="stat-card">
            <h3>{votersList.length}</h3>
            <p>Voters Submitted</p>
          </div>
        </header>

        <section className="admin-content-grid">
          <div className="chart-card">
            <h2>Live Results</h2>

            <PieChart width={400} height={300}>
              <Pie
                data={results}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </div>

          <div className="table-card">
            <h2>Voters Who Have Voted</h2>

            <table className="voters-table">
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {votersList.map((voter, index) => (
                  <tr key={index}>
                    <td>{voter.reg}</td>
                    <td>{voter.name}</td>
                    <td>
                      <span className="status-badge">{voter.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
