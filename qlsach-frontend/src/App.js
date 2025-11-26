import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import SachTable from "./components/SachTable";
import Login from "./components/Login";
import RequestReset from "./components/RequestReset";
import ResetPassword from "./components/ResetPassword";
import "./App.css";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user, logout } = useAuth();
  return (
    <div className="App">
      <div className="bg-primary text-white py-3 mb-4">
        <div className="container d-flex align-items-center justify-content-between">
          <div>
            <h1 className="mb-0"> Blockchain Book Management System</h1>
            <p className="mb-0">Powered by Hyperledger Fabric & React.js</p>
          </div>
          <div>
            {user ? (
              <>
                <span className="me-2">Xin chao, {user.username}</span>
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                >
                  Dang xuat
                </button>
              </>
            ) : (
              <a className="btn btn-light btn-sm" href="/login">
                Dang nhap
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Simple client-side routing based on path */}
      {window.location.pathname === "/login" && <Login />}
      {window.location.pathname === "/request-reset" && <RequestReset />}
      {window.location.pathname === "/reset" && <ResetPassword />}
      {window.location.pathname === "/" && <SachTable />}
      {/* Fallback: show SachTable */}
      {["/home", ""].includes(window.location.pathname) &&
        window.location.pathname !== "/" && <SachTable />}

      <footer className="bg-dark text-white text-center py-3 mt-5">
        <div className="container">
          <p className="mb-0">
            {String.fromCharCode(169)} 2024 QLSach Blockchain App - Hyperledger
            Fabric
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
