// client/src/pages/leads/ArchivedLeads.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import DataTable from "../../components/DataTable";
import { FiTrash2 } from "react-icons/fi";

function ArchivedLeads() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const [filters, setFilters] = useState({ leadType: "", subType: "" });
  const role = JSON.parse(localStorage.getItem("user") || "{}").role || "";

  const load = () => {
    API.get("/leads", { params: { page: state.page, q: state.q, status: "archived" } })
      .then((r) => {
        const leads = r.data.docs || r.data.items || r.data || [];
        const sorted = leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setState((s) => ({
          ...s,
          items: sorted,
          pages: r.data.pages || r.data.totalPages || 1,
        }));
      })
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

  // ✅ Apply filters dynamically (leadType, subType only)
  const filteredItems = useMemo(() => {
    return state.items.filter((lead) => {
      const typeMatch = filters.leadType ? lead.leadType === filters.leadType : true;
      const subMatch = filters.subType ? lead.subType === filters.subType : true;
      return typeMatch && subMatch;
    });
  }, [state.items, filters]);

  // ✅ Collect unique dropdown values
  const leadTypes = [...new Set(state.items.map((l) => l.leadType).filter(Boolean))];
  const subTypes = [...new Set(
    state.items
      .filter((l) => !filters.leadType || l.leadType === filters.leadType)
      .map((l) => l.subType)
      .filter(Boolean)
  )];

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Archived Leads</h1>
      </header>

      {/* ✅ Filters Section (only leadType & subType) */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <select
          value={filters.leadType}
          onChange={(e) =>
            setFilters((f) => ({ ...f, leadType: e.target.value, subType: "" }))
          }
        >
          <option value="">All Lead Types</option>
          {leadTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filters.subType}
          onChange={(e) => setFilters((f) => ({ ...f, subType: e.target.value }))}
        >
          <option value="">All Sub Types</option>
          {subTypes.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {(filters.leadType || filters.subType) && (
          <button
            className="btn"
            style={{ background: "#e5e7eb", color: "#111" }}
            onClick={() => setFilters({ leadType: "", subType: "" })}
          >
            Reset
          </button>
        )}
      </div>

      <DataTable
        columns={[
          {
            header: "Sr.No.",
            accessor: (row, i) => (
              <div style={{ textAlign: "center" }}>{i + 1}</div>
            ),
            className: "col-center",
          },
          {
            header: "Lead ID",
            accessor: (row, i, exportMode) =>
              exportMode ? (
                row.leadId
              ) : (
                <span
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => navigate(`/leads/view/${row._id}`)}
                >
                  {row.leadId}
                </span>
              ),
            className: "col-center",
          },
          { header: "Customer Name", accessor: "name" },
          { header: "Mobile", accessor: "mobile", className: "col-center" },
          { header: "Email", accessor: "email" },
          { header: "Lead Type", accessor: "leadType", className: "col-center" },
          {
            header: "Sub Type",
            accessor: (row) => row.subType || "N/A",
            className: "col-center",
          },
          {
            header: "Created On",
            accessor: (row) =>
              row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-",
            className: "col-center",
          },
          {
            header: "Status",
            accessor: () => (
              <div style={{ textAlign: "center" }}>In Progress</div>
            ),
            className: "col-center",
          },
          {
            header: "Actions",
            accessor: (row) => (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {(role === "admin" || role === "superadmin") && (
                  <FiTrash2
                    style={{
                      cursor: "pointer",
                      color: "#dc2626",
                      fontSize: "1.2em",
                    }}
                    title="Delete Lead"
                    onClick={() => deleteLead(row._id)}
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={filteredItems}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState((s) => ({ ...s, page: p }))}
        onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))}
      />
    </div>
  );
}

export default ArchivedLeads;
