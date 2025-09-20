import React from "react";
import { Routes, Route } from "react-router-dom";

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
import LeadForm from "./pages/LeadForm";   // ✅ only once
import Sidebar from "./components/Sidebar";

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="content">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          
          {/* ✅ allow both admin + superadmin */}
          <Route path="/users" element={<Protected roles={['admin','superadmin']}><Users /></Protected>} />
          
          <Route path="/leads" element={<Protected><Leads /></Protected>} />
          <Route path="/leads/new" element={<Protected><LeadForm /></Protected>} />
          <Route path="/customers" element={<Protected><Customers /></Protected>} />
          <Route path="/cases" element={<Protected><Cases /></Protected>} />
          <Route path="/partners" element={<Protected><Partners /></Protected>} />
          <Route path="/branches" element={<Protected><Branches /></Protected>} />

          {/* Default fallback */}
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </div>
  );
}
