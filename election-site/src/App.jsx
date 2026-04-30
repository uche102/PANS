import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const Login = lazy(() => import("./pages/Login.jsx"));
const Ballot = lazy(() => import("./pages/Ballot.jsx"));
const Success = lazy(() => import("./pages/Success.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));

const ProtectedBallot = ({ children }) => {
  const voterSession = sessionStorage.getItem("pansVoter");
  return voterSession ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/ballot"
            element={
              <ProtectedBallot>
                <Ballot />
              </ProtectedBallot>
            }
          />
          <Route path="/success" element={<Success />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </main>
  );
}

export default App;
