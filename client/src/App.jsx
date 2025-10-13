// client/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import FreePool from "./pages/leads/FreePool";
import ArchivedLeads from "./pages/leads/ArchivedLeads";
import DeletedLeads from "./pages/leads/DeletedLeads";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateAdmin from "./pages/CreateAdmin";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Customers from "./pages/Customers";
import ViewCustomer from "./pages/ViewCustomer";  // 👈 import it
import EditCustomer from "./pages/EditCustomer";
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
import PartnerView from "./pages/PartnerView"; // ✅ ADD THIS IMPORT
import EditPartner from "./pages/EditPartner"; // ✅ ADD THIS FOR EDIT FUNCTIONALITY





// Layouts
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />

      {/* 🔹 Public Shareable Form Route (NO Protected, NO MainLayout) */}
      <Route path="/cases/:id/public-form" element={<LeadFormCase />} />

      {/* Protected Routes with Main Layout */}
      <Route
        path="/dashboard"
        element={
          <Protected>
            <MainLayout><Dashboard /></MainLayout>
          </Protected>
        }
      />
      
      <Route 
        path="/cases/:id/tasks" 
        element={
          <Protected>
            <MainLayout><CaseTasks /></MainLayout>
          </Protected>
        } 
      />

      <Route
        path="/users"
        element={
          <Protected roles={["admin", "superadmin"]}>
            <MainLayout><Users /></MainLayout>
          </Protected>
        }
      />

      <Route path="/create-admin" element={<CreateAdmin />} />


      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Leads Routes */}
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
       <Route
          path="/customers/:id"
          element={
            <Protected>
              <MainLayout><ViewCustomer /></MainLayout>
            </Protected>
          }
        />
      <Route
          path="/customers/:id/edit"
          element={
            <Protected>
              <MainLayout><EditCustomer /></MainLayout>
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

      {/* Partners Routes - ✅ FIXED */}
      <Route
        path="/partners"
        element={
          <Protected>
            <MainLayout><Partners /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/partners/:id/view"
        element={
          <Protected>
            <MainLayout><PartnerView /></MainLayout>
          </Protected>
        }
      />
      <Route
        path="/partners/:id/edit"
        element={
          <Protected>
            <MainLayout><EditPartner /></MainLayout>
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