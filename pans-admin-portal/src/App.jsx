import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import "./index.css";

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <Router>
      <Routes>
        {/* LANDING PAGE: If not admin, show login. If admin, go to dashboard */}
        <Route
          path="/"
          element={
            !isAdmin ? (
              <AdminLogin setAuth={setIsAdmin} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* PROTECTED DASHBOARD: If not admin, kick back to login */}
        <Route
          path="/dashboard"
          element={
            isAdmin ? (
              <AdminDashboard setAuth={setIsAdmin} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* 404 FALLBACK: Redirect any weird URLs back to the start */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
