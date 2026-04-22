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
  const [activeTab, setActiveTab] = useState("results");
  const [presidentialData, setPresidentialData] = useState([]);
  const [votersList, setVotersList] = useState([]);

  // 2. Optimized Sync Function
const syncData = async () => {
  try {
    const resResults = await fetch("/api/results");
    if (!resResults.ok) throw new Error(`Results error: ${resResults.status}`);
    const resultsData = await resResults.json();
    setPresidentialData(resultsData);

    const resVoters = await fetch("/api/voters");
    if (!resVoters.ok) throw new Error(`Voters error: ${resVoters.status}`);
    const votersData = await resVoters.json();
    setVotersList(votersData);
  } catch (err) {
    console.error("Dashboard Sync Error:", err);
  }
};

  // 3. Single useEffect for Polling (Consolidated)
  useEffect(() => {
    // Initial load
    syncData();

    // Polling every 5 seconds
    const interval = setInterval(() => {
      syncData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const COLORS = ["#10b981", "#fbbf24", "#3b82f6", "#ef4444"];

 const handleLogout = () => {
   localStorage.removeItem("adminLoggedIn");
   navigate("/");
 };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>PANS ADMIN</h2>
        </div>
        <nav>
          <button
            className={`admin-nav-item ${activeTab === "voters" ? "active" : ""}`}
            onClick={() => setActiveTab("voters")}
          >
            <Users size={20} /> Voters List
          </button>

          <button onClick={handleLogout} className="admin-nav-item">
            <LogOut size={20} /> Exit
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {activeTab === "results"
              ? "Election Analytics"
              : "Registered Voters"}
          </h1>
          <div className="header-actions">
            <button className="secondary-button" onClick={syncData}>
              <RefreshCw size={16} /> Sync Live Data
            </button>
            <div className="stat-card">
              <small>Total Votes Cast</small>
              <h3>{votersList.length} / 300</h3>
            </div>
          </div>
        </header>

        {activeTab === "results" ? (
          <section
            className="admin-charts-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "20px",
            }}
          >
            {[...new Set(presidentialData.map((item) => item.office))].map(
              (officeName) => (
                <div className="admin-chart-card" key={officeName}>
                  <h3>{officeName} Results</h3>
                  <div style={{ width: "100%", height: "300px", minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={presidentialData.filter(
                            (d) => d.office === officeName,
                          )}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {presidentialData
                            .filter((d) => d.office === officeName)
                            .map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ),
            )}
          </section>
        ) : (
          <section className="voters-section">
            <div className="table-card">
              <table className="voters-table">
                <thead>
                  <tr>
                    <th>Registration Number</th>
                    <th>Time Voted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {votersList.length > 0 ? (
                    votersList.map((voter, index) => (
                      <tr key={index}>
                        <td>{voter.reg}</td>
                        <td>{voter.time}</td>
                        <td>
                          <span className="status-badge">Verified</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No votes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
