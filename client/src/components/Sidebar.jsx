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
  FiChevronRight,
} from "react-icons/fi";
import logo from "../assets/logo.png";
import "../styles/Sidebar.css";

export default function Sidebar({ isMobile, open, setOpen }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openLeads, setOpenLeads] = useState(false);
  const isAuthed = !!localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Manual toggle (three dots button)
  const toggleCollapse = () => setCollapsed(!collapsed);

  // Auto expand/collapse on hover
  const handleMouseEnter = () => {
    if (collapsed) setCollapsed(false); // expand on hover
  };
  const handleMouseLeave = () => {
    if (!collapsed) setCollapsed(true); // collapse when leaving
  };

  return (
    <div
      className={`sidebar ${collapsed ? "collapsed" : ""} ${
        isMobile && !open ? "mobile-hidden" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toggle button (desktop collapse) */}
      {!isMobile && (
        <button className="toggle-btn" onClick={toggleCollapse}>
          <FiMenu />
        </button>
      )}

      {/* Logo */}
      <div className="logo-container">
        <img src={logo} alt="Logo" className="sidebar-logo" />
      </div>

      {/* Navigation */}
      <nav className="nav">
        {isAuthed ? (
          <>
            <NavLink to="/dashboard">
              <FiLayout />
              <span>Dashboard</span>
            </NavLink>

            {/* Leads submenu */}
            <div className="submenu">
              <button
                className="submenu-btn"
                onClick={() => setOpenLeads(!openLeads)}
              >
                <div className="submenu-content">
                  <FiUsers />
                  <span>Leads</span>
                </div>
                {openLeads ? (
                  <FiChevronDown className="chevron rotate" />
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

            <NavLink to="/customers">
              <FiUser />
              <span>Customer Management</span>
            </NavLink>

            <NavLink to="/cases">
              <FiDatabase />
              <span>Loan Cases</span>
            </NavLink>

            <NavLink to="/partners">
              <FiShare2 />
              <span>Channel Partner</span>
            </NavLink>

            <NavLink to="/branches">
              <FiGitBranch />
              <span>Bank Branch</span>
            </NavLink>

            {(user.role === "admin" || user.role === "superadmin") && (
              <NavLink to="/users">
                <FiShield />
                <span>User Management</span>
              </NavLink>
            )}
          </>
        ) : (
          <NavLink to="/login">
            <FiLogIn />
            <span>Login</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
