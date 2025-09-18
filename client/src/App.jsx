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
import Sidebar from "./components/Sidebar";  // ✅ import Sidebar

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
