import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Ballot from "./pages/Ballot.jsx";
import Success from "./pages/Success";
import "./index.css"; 

function App() {
  return (
    <Router>
      <main>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/ballot" element={<Ballot />} />
          <Route path="/success" element={<Success />} />
          {/* <Route path="/admin" element={<AdminDashboard />} />  */}
        </Routes>
      </main>
    </Router>
  );
}

export default App;
