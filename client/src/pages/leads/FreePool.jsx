// client/src/pages/leads/FreePool.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import DataTable from "../../components/DataTable";

// ✅ Precise Aging Helper
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
  if (sec < 60) return `${sec} sec${sec > 1 ? "s" : ""} ago`;
  if (min < 60) return `${min} min${min > 1 ? "s" : ""} ago`;
  if (hr < 24) {
    const remainMin = min % 60;
    return remainMin > 0
      ? `${hr} hr${hr > 1 ? "s" : ""} ${remainMin} min ago`
      : `${hr} hr${hr > 1 ? "s" : ""} ago`;
  }
  if (day === 1) {
    return `Yesterday at ${past.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (day < 30) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (day < 365) return `${Math.floor(day / 30)} month${Math.floor(day / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(day / 365)} year${Math.floor(day / 365) > 1 ? "s" : ""} ago`;
}

function FreePool() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const role = (JSON.parse(localStorage.getItem("user") || "{}").role) || "";

  const load = () => {
    API.get("/leads", {
      params: { page: state.page, q: state.q, status: "free_pool" },
    })
      .then((r) => {
        // ✅ Always ensure newest first
        const sorted = (r.data.items || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setState((s) => ({
          ...s,
          items: sorted,
          pages: r.data.pages || 1,
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

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Free Pool Leads</h1>
        <button className="btn" onClick={() => navigate("/leads/new")}>
          + Add Lead
        </button>
      </header>

      <DataTable
        columns={[
          { header: "Sr.No.", accessor: (row, i) => (state.page - 1) * 10 + i + 1 },
          {
            header: "Date",
            accessor: (row) =>
              row.createdAt
                ? new Date(row.createdAt).toLocaleDateString()
                : "-",
          },
          {
            header: "Aging",
            accessor: (row) => timeAgo(row.createdAt), // ✅ exact relative time
          },
          {
            header: "Lead ID",
            accessor: (row, i, exportMode) =>
              exportMode ? row.leadId : (
                <span
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => navigate(`/leads/${row._id}/view`)}
                >
                  {row.leadId}
                </span>
              ),
          },
          { header: "Customer Name", accessor: "name" },
          { header: "Mobile", accessor: "mobile" },
          { header: "Email", accessor: "email" },
          { header: "Lead Type", accessor: "leadType" },
          { header: "Status", accessor: "status" },
          {
            header: "Actions",
            accessor: (row) => (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(role === "admin" || role === "superadmin") && (
                  <button
                    className="btn danger"
                    onClick={() => deleteLead(row._id)}
                  >
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

export default FreePool;
