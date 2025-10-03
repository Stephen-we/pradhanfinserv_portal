// client/src/pages/leads/FreePool.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import DataTable from "../../components/DataTable";
import "../../styles/DataTable.css";
import { FiTrash2 } from "react-icons/fi";

// ✅ Compact Aging Helper
function timeAgo(date) {
  if (!date) return "-";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;

  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day === 1) return "1 day ago";
  if (day < 30) return `${day}d ago`;
  if (day < 365) return `${Math.floor(day / 30)}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

function FreePool() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const [filters, setFilters] = useState({
    leadType: "",
    subType: "",
    workflowStatus: "",
  });
  const role = JSON.parse(localStorage.getItem("user") || "{}").role || "";

  const load = () => {
    API.get("/leads", {
      params: { page: state.page, q: state.q, status: "free_pool" },
    })
      .then((r) => {
        const leads = r.data.docs || r.data.items || r.data || [];
        const sorted = leads.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setState((s) => ({
          ...s,
          items: sorted,
          pages: r.data.pages || r.data.totalPages || 1,
        }));
      })
      .catch((err) => console.error("❌ Error loading leads:", err));
  };

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  const deleteLead = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await API.delete(`/leads/${id}`);
      load();
    } catch {
      alert("Error deleting lead");
    }
  };

  const updateWorkflow = async (id, newStatus) => {
    try {
      await API.patch(`/leads/${id}`, { workflowStatus: newStatus });
      load();
    } catch {
      alert("Error updating workflow status");
    }
  };

  // ✅ Apply filters dynamically
  const filteredItems = useMemo(() => {
    let items = state.items;

    // filter by leadType
    if (filters.leadType) {
      items = items.filter((l) => l.leadType === filters.leadType);
    }

    // filter by subType
    if (filters.subType) {
      items = items.filter((l) => l.subType === filters.subType);
    }

    // filter by workflowStatus
    if (filters.workflowStatus) {
      items = items.filter((l) => l.workflowStatus === filters.workflowStatus);
    }

    // ✅ keep Postpone at bottom
    items = [...items].sort((a, b) => {
      if (a.workflowStatus === "Postpone" && b.workflowStatus !== "Postpone")
        return 1;
      if (a.workflowStatus !== "Postpone" && b.workflowStatus === "Postpone")
        return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return items;
  }, [state.items, filters]);

  // ✅ Collect unique options for dropdowns
  const leadTypes = [
    ...new Set(state.items.map((l) => l.leadType).filter(Boolean)),
  ];
  const subTypes = [
    ...new Set(
      state.items
        .filter((l) => !filters.leadType || l.leadType === filters.leadType)
        .map((l) => l.subType)
        .filter(Boolean)
    ),
  ];
  const workflowStatuses = ["FreePool", "Postpone"];

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
        <h1>Free Pool Leads</h1>
        <button className="btn" onClick={() => navigate("/leads/new")}>
          + Add Lead
        </button>
      </header>

      {/* ✅ Filters Section */}
      <div
        style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}
      >
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
          onChange={(e) =>
            setFilters((f) => ({ ...f, subType: e.target.value }))
          }
        >
          <option value="">All Sub Types</option>
          {subTypes.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={filters.workflowStatus}
          onChange={(e) =>
            setFilters((f) => ({ ...f, workflowStatus: e.target.value }))
          }
        >
          <option value="">All Status</option>
          {workflowStatuses.map((ws) => (
            <option key={ws} value={ws}>
              {ws}
            </option>
          ))}
        </select>

        {(filters.leadType || filters.subType || filters.workflowStatus) && (
          <button
            className="btn"
            style={{ background: "#e5e7eb", color: "#111" }}
            onClick={() =>
              setFilters({ leadType: "", subType: "", workflowStatus: "" })
            }
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
              row.createdAt
                ? new Date(row.createdAt).toLocaleDateString("en-IN")
                : "-",
            className: "col-center",
          },
          {
            header: "Aging",
            accessor: (row) => (
              <div style={{ textAlign: "center" }}>{timeAgo(row.createdAt)}</div>
            ),
            className: "col-center",
          },
          {
            header: "Actions",
            accessor: (row) => (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* ✅ Workflow dropdown */}
                <select
                  value={row.workflowStatus || "FreePool"}
                  onChange={(e) => updateWorkflow(row._id, e.target.value)}
                  style={{ padding: "2px 6px" }}
                >
                  <option value="FreePool">Free Pool</option>
                  <option value="Postpone">Postpone</option>
                </select>

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

export default FreePool;
