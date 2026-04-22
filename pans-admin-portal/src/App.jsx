import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));
const Dashboard = lazy(() => import("./pages/AdminDashboard.jsx"));

const ProtectedAdmin = ({ children }) => {
  const adminLoggedIn = localStorage.getItem("adminLoggedIn");
  return adminLoggedIn === "true" ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedAdmin>
                <Dashboard />
              </ProtectedAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </main>
  );
}

export default App;
