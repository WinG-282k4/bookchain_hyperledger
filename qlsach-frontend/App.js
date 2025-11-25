// qlsach-frontend/src/App.js

import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import SachTable from "./components/SachTable";
import Login from "./components/Login";
import "./App.css";

// Header v� Navigation
const Header = () => {
  const { user, logout } = useAuth();

  return (
    <div className="bg-primary text-white py-3 mb-4 shadow-sm">
      <div className="container d-flex justify-content-between align-items-center">
        <h1 className="mb-0"> He Thong Quan Ly Sach Blockchain</h1>
        {user ? (
          <div className="d-flex align-items-center">
            <span className="me-3 fw-bold">
              Xin chao, {user.username} ({user.role})
            </span>
            <button className="btn btn-sm btn-light" onClick={logout}>
              Dang Xuat
            </button>
          </div>
        ) : (
          <span className="fw-bold">Guest Mode</span>
        )}
      </div>
    </div>
  );
};

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route
            path="/"
            element={user ? <SachTable /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login />}
          />
          {/* Route catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <footer className="bg-dark text-white text-center py-3 mt-5">
          <div className="container">
            <p className="mb-0">
              � 2024 QLSach Blockchain App - Hyperledger Fabric
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
