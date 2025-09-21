// client/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import FreePool from "./pages/leads/FreePool";
import ArchivedLeads from "./pages/leads/ArchivedLeads";
import DeletedLeads from "./pages/leads/DeletedLeads";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Customers from "./pages/Customers";
import Cases from "./pages/Cases";
import Partners from "./pages/Partners";
import Branches from "./pages/Branches";
import { Protected } from "./components/Protected";
import ViewLead from "./pages/leads/ViewLead";
import LeadForm from "./pages/LeadForm";
import Sidebar from "./components/Sidebar";
import ViewBranch from "./pages/ViewBranch";
import EditBranch from "./pages/EditBranch";



export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="content">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/users" element={<Protected roles={['admin','superadmin']}><Users /></Protected>} />

          {/* Leads */}
          <Route path="/leads" element={<Protected><FreePool /></Protected>} />
          <Route path="/leads/new" element={<Protected><LeadForm /></Protected>} />
          <Route path="/leads/:id/view" element={<Protected><ViewLead /></Protected>} />
          <Route path="/leads/:id/edit" element={<Protected><LeadForm /></Protected>} />
          <Route path="/leads/archived" element={<Protected><ArchivedLeads /></Protected>} />
          <Route path="/leads/deleted" element={<Protected><DeletedLeads /></Protected>} />
          <Route path="/customers" element={<Protected><Customers /></Protected>} />
          <Route path="/cases" element={<Protected><Cases /></Protected>} />
          <Route path="/partners" element={<Protected><Partners /></Protected>} />
          <Route path="/branches" element={<Protected><Branches /></Protected>} />
          <Route path="/branches/:id/view" element={<Protected><ViewBranch /></Protected>} />
          <Route
          path="/branches/:id/edit"element={<Protected><EditBranch /></Protected>}/>



          {/* Fallback */}
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </div>
  );
}
