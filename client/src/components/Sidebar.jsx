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
  FiMenu,
  FiChevronDown,
  FiChevronRight
} from "react-icons/fi";
import logo from "../assets/logo.png";
import "../styles/Sidebar.css";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openLeads, setOpenLeads] = useState(false); // submenu state
  const isAuthed = !!localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}"); // ✅ get user info

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

            {/* Leads with submenu */}
            <div className="submenu">
              <button
                className="submenu-btn"
                onClick={() => setOpenLeads(!openLeads)}
              >
                <FiUsers /> <span>Leads</span>
                {openLeads ? (
                  <FiChevronDown className="chevron" />
                ) : (
                  <FiChevronRight className="chevron" />
                )}
              </button>
              {openLeads && (
                <div className="submenu-links">
                  <NavLink to="/leads">Free Pool</NavLink>
                  <NavLink to="/leads/archived">Archived Leads</NavLink>
                  <NavLink to="/leads/deleted">Deleted Leads</NavLink>
                </div>
              )}
            </div>

            <NavLink to="/customers"><FiUser /> <span>Customer Management</span></NavLink>
            <NavLink to="/cases"><FiDatabase /> <span>Loan Cases</span></NavLink>
            <NavLink to="/partners"><FiShare2 /> <span>Channel Partner</span></NavLink>
            <NavLink to="/branches"><FiGitBranch /> <span>Bank Branch</span></NavLink>

            {/* ✅ Only admin & superadmin see User Management */}
            {(user.role === "admin" || user.role === "superadmin") && (
              <NavLink to="/users"><FiShield /> <span>User Management</span></NavLink>
            )}
          </>
        ) : (
          <NavLink to="/login"><FiLogIn /> <span>Login</span></NavLink>
        )}
      </div>
    </div>
  );
}
