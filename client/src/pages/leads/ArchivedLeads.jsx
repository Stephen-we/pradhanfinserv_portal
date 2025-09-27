// client/src/pages/leads/ArchivedLeads.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import DataTable from "../../components/DataTable";

function ArchivedLeads() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const role = (JSON.parse(localStorage.getItem("user") || "{}").role) || "";

  const load = () => {
    API.get("/leads", { params: { page: state.page, q: state.q, status: "archived" } })
      .then((r) =>
        setState((s) => ({ ...s, items: r.data.items || [], pages: r.data.pages || 1 }))
      )
      .catch((err) => console.error("❌ Error loading archived leads:", err));
  };

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  const deleteLead = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this lead?")) return;
    try {
      await API.delete(`/leads/${id}`);
      load();
    } catch {
      alert("Error deleting lead");
    }
  };

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Archived Leads</h1>
      </header>

      <DataTable
        columns={[
          { header: "Sr.No.", accessor: (row, i) => (state.page - 1) * 10 + i + 1 },
          { header: "Lead ID", accessor: (row) => (
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); navigate(`/leads/view/${row._id}`); }}
                style={{ color: "#2563eb", textDecoration: "underline", cursor: "pointer" }}
              >
                {row.leadId}
              </a>
            )
          },
          { header: "Customer Name", accessor: "name" },
          { header: "Mobile", accessor: "mobile" },
          { header: "Email", accessor: "email" },
          { header: "Lead Type", accessor: "leadType" },
          { header: "Created On", accessor: (row) => new Date(row.createdAt).toLocaleDateString() },
          {
            header: "Actions",
            accessor: (row) => (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(role === "admin" || role === "superadmin") && (
                  <button className="btn danger" onClick={() => deleteLead(row._id)}>
                    Delete
                  </button>
                )}
              </div>
            ),
          },
        ]}
        rows={state.items}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState((s) => ({ ...s, page: p }))}
        onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))}
      />
    </div>
  );
}

export default ArchivedLeads;
