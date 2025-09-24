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
import ViewBranch from "./pages/ViewBranch";
import EditBranch from "./pages/EditBranch";
import ViewLeadCase from "./pages/cases/ViewLeadCase";
import LeadFormCase from "./pages/cases/LeadFormCase";
import CaseTasks from "./pages/cases/CaseTasks";

// Layouts
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />

      {/* Protected Routes with Main Layout */}
      <Route
        path="/dashboard"
        element={
          <Protected>
            <MainLayout><Dashboard /></MainLayout>
          </Protected>
        }
      />
      <Route path="/cases/:id/tasks" element={<CaseTasks />} />

      <Route
        path="/users"
        element={
          <Protected roles={["admin", "superadmin"]}>
            <MainLayout><Users /></MainLayout>
          </Protected>
        }
      />

      {/* Leads */}
      <Route
        path="/leads"
        element={
          <Protected>
            <MainLayout><FreePool /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/leads/new"
        element={
          <Protected>
            <MainLayout><LeadForm /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/leads/view/:id"
        element={
          <Protected>
            <MainLayout><ViewLead /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/leads/:id/edit"
        element={
          <Protected>
            <MainLayout><LeadForm /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/leads/archived"
        element={
          <Protected>
            <MainLayout><ArchivedLeads /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/leads/deleted"
        element={
          <Protected>
            <MainLayout><DeletedLeads /></MainLayout>
          </Protected>
        }
      />

      {/* Customers */}
      <Route
        path="/customers"
        element={
          <Protected>
            <MainLayout><Customers /></MainLayout>
          </Protected>
        }
      />

      {/* Cases */}
      <Route
        path="/cases"
        element={
          <Protected>
            <MainLayout><Cases /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/cases/:id/view"
        element={
          <Protected>
            <MainLayout><ViewLeadCase /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/cases/:id/edit"
        element={
          <Protected>
            <MainLayout><LeadFormCase /></MainLayout>
          </Protected>
        }
      />

      {/* Partners */}
      <Route
        path="/partners"
        element={
          <Protected>
            <MainLayout><Partners /></MainLayout>
          </Protected>
        }
      />

      {/* Branches */}
      <Route
        path="/branches"
        element={
          <Protected>
            <MainLayout><Branches /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/branches/:id/view"
        element={
          <Protected>
            <MainLayout><ViewBranch /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/branches/:id/edit"
        element={
          <Protected>
            <MainLayout><EditBranch /></MainLayout>
          </Protected>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<AuthLayout><Login /></AuthLayout>} />
    </Routes>
  );
}
