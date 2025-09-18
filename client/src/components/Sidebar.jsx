import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiLayout,
  FiUser,
  FiUsers,
  FiDatabase,
  FiShare2,
  FiGitBranch,
  FiShield,
  FiLogIn,
  FiMenu
} from "react-icons/fi";
import logo from "../assets/logo.png";
import "../styles/Sidebar.css";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const isAuthed = !!localStorage.getItem("token");

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Toggle button */}
      <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
        <FiMenu />
      </button>

      {/* Logo */}
      <div className="logo-container">
        <img src={logo} alt="Logo" className="sidebar-logo" />
      </div>

      {/* Nav Links */}
      <div className="nav">
        {isAuthed ? (
          <>
            <NavLink to="/dashboard"><FiLayout /> <span>Dashboard</span></NavLink>
            <NavLink to="/leads"><FiUsers /> <span>Leads</span></NavLink>
            <NavLink to="/customers"><FiUser /> <span>Customer Management</span></NavLink>
            <NavLink to="/cases"><FiDatabase /> <span>Loan Cases</span></NavLink>
            <NavLink to="/partners"><FiShare2 /> <span>Channel Partner</span></NavLink>
            <NavLink to="/branches"><FiGitBranch /> <span>Bank Branch</span></NavLink>
            <NavLink to="/users"><FiShield /> <span>User Management</span></NavLink>
          </>
        ) : (
          <NavLink to="/login"><FiLogIn /> <span>Login</span></NavLink>
        )}
      </div>
    </div>
  );
}
