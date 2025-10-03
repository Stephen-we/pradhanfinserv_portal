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
  const [filters, setFilters] = useState({ leadType: "", subType: "" });
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

  // ✅ Apply filters dynamically
  const filteredItems = useMemo(() => {
    return state.items.filter((lead) => {
      const typeMatch = filters.leadType
        ? lead.leadType === filters.leadType
        : true;
      const subMatch = filters.subType
        ? lead.subType === filters.subType
        : true;
      return typeMatch && subMatch;
    });
  }, [state.items, filters]);

  // ✅ Collect unique options for dropdowns
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
        <h1>Free Pool Leads</h1>
        <button className="btn" onClick={() => navigate("/leads/new")}>
          + Add Lead
        </button>
      </header>

      {/* ✅ Filters Section */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
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
              <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                {i + 1}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Date",
            accessor: (row) => (
              <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                {row.createdAt
                  ? new Date(row.createdAt).toLocaleDateString()
                  : "-"}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Aging",
            accessor: (row) => (
              <div
                style={{
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  lineHeight: "1.2",
                  padding: "4px 0",
                }}
              >
                {timeAgo(row.createdAt)}
              </div>
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
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                    whiteSpace: "nowrap",
                    justifyContent: "center",
                    padding: "4px 0",
                  }}
                  onClick={() => navigate(`/leads/view/${row._id}`)}
                >
                  {row.leadId}
                </span>
              ),
            className: "col-center",
          },
          {
            header: "Customer Name",
            accessor: (row) => (
              <div style={{ whiteSpace: "nowrap", padding: "4px 0" }}>
                {row.name}
              </div>
            ),
          },
          {
            header: "Mobile",
            accessor: (row) => (
              <div
                style={{
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  padding: "4px 0",
                }}
              >
                {row.mobile}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Email",
            accessor: (row) => (
              <div style={{ whiteSpace: "nowrap", padding: "4px 0" }}>
                {row.email}
              </div>
            ),
          },
          {
            header: "Lead Type",
            accessor: (row) => (
              <div
                style={{
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  padding: "4px 0",
                }}
              >
                {row.leadType}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Sub Type",
            accessor: (row) => (
              <div
                style={{
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  padding: "4px 0",
                }}
              >
                {row.subType || "N/A"}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Date of Birth",
            accessor: (row) => (
              <div
                style={{
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  padding: "4px 0",
                }}
              >
                {row.dob
                  ? new Date(row.dob).toLocaleDateString("en-IN")
                  : "N/A"}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Status",
            accessor: (row) => (
              <div
                style={{
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  padding: "4px 0",
                }}
              >
                {row.status}
              </div>
            ),
            className: "col-center",
          },
          {
            header: "Actions",
            accessor: (row) => (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "4px 0",
                }}
              >
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
            className: "col-center",
            style: { width: "50px" },
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
