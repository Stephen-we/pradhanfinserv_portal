import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  FiLayout,
  FiUser,
  FiUsers,
  FiDatabase,
  FiShare2,
  FiGitBranch,
  FiShield,
  FiLogIn
} from "react-icons/fi";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Cases from "./pages/Cases";
import Partners from "./pages/Partners";
import Branches from "./pages/Branches";
import { Protected } from "./components/Protected";
import logo from "./assets/logo.png";

const Sidebar = () => {
  const isAuthed = !!localStorage.getItem("token");

  return (
    <div className="sidebar">
      {/* Only logo full width */}
      <div className="logo-container">
        <img src={logo} alt="Logo" className="sidebar-logo" />
      </div>

      <div className="nav">
        {isAuthed ? (
          <>
            <NavLink to="/dashboard"><FiLayout /> Dashboard</NavLink>
            <NavLink to="/leads"><FiUsers /> Leads</NavLink>
            <NavLink to="/customers"><FiUser /> Customer Management</NavLink>
            <NavLink to="/cases"><FiDatabase /> Loan Cases</NavLink>
            <NavLink to="/partners"><FiShare2 /> Channel Partner</NavLink>
            <NavLink to="/branches"><FiGitBranch /> Bank Branch</NavLink>
            <NavLink to="/users"><FiShield /> User Management</NavLink>
          </>
        ) : (
          <NavLink to="/login"><FiLogIn /> Login</NavLink>
        )}
      </div>
    </div>
  );
};


export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/users" element={<Protected roles={['admin']}><Users /></Protected>} />
          <Route path="/leads" element={<Protected><Leads /></Protected>} />
          <Route path="/customers" element={<Protected><Customers /></Protected>} />
          <Route path="/cases" element={<Protected><Cases /></Protected>} />
          <Route path="/partners" element={<Protected><Partners /></Protected>} />
          <Route path="/branches" element={<Protected><Branches /></Protected>} />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </div>
  );
}
