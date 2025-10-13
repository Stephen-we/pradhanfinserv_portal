import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Cases() {
  const [state, setState] = useState({
    items: [],
    page: 1,
    pages: 1,
    q: "",
    users: [],
    filterAssigned: "",
    filterTask: "",
  });

  const [assigningId, setAssigningId] = useState(null);
  const [localAssignments, setLocalAssignments] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Current user
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = ["admin", "superadmin"].includes(user.role);

  // ✅ Load Cases
  const load = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await API.get("/cases", {
        params: {
          page: state.page,
          q: state.q.trim() || undefined,
          assignedTo: state.filterAssigned || undefined,
          task: state.filterTask || undefined,
        },
      });

      const items = Array.isArray(data) ? data : data.items || [];
      const pages = Array.isArray(data) ? 1 : data.pages || 1;
      setState((s) => ({ ...s, items, pages }));
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setIsLoading(false);
    }
  }, [state.page, state.q, state.filterAssigned, state.filterTask]);

  useEffect(() => {
    load();
  }, [load]);

  // ✅ Load Users
  const loadUsers = async () => {
    try {
      const { data } = await API.get("/users");
      setState((s) => ({ ...s, users: data }));
    } catch (err) {
      if (err.response?.status === 403) {
        const { data } = await API.get("/users/public");
        setState((s) => ({ ...s, users: data }));
      } else console.error("User load failed:", err);
    }
  };
  useEffect(() => {
    loadUsers();
  }, []);

  // ✅ Assign handler (admin only)
  const handleAssignChange = async (row, userId) => {
    if (!isAdmin) {
      alert("You don’t have permission to assign cases.");
      return;
    }
    try {
      setAssigningId(row._id);
      setLocalAssignments((prev) => ({ ...prev, [row._id]: userId || null }));
      await API.put(`/cases/${row._id}`, { assignedTo: userId || null });
      load();
    } catch (error) {
      console.error("Assignment failed:", error);
      alert(`Assignment failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setAssigningId(null);
    }
  };

  const getAssignedId = (row) => {
    if (localAssignments[row._id] !== undefined)
      return localAssignments[row._id] || "";
    if (!row?.assignedTo) return "";
    if (typeof row.assignedTo === "object") return row.assignedTo._id || "";
    if (typeof row.assignedTo === "string") return row.assignedTo;
    return "";
  };

  // ✅ OTP Protected Export
  const handleExport = async () => {
    try {
      const { data } = await API.post("/cases/export/request-otp");
      alert("OTP sent to owner’s email. Please enter it to confirm export.");
      const otp = prompt("Enter OTP received by owner:");
      if (!otp) return alert("Export cancelled.");

      const res = await API.post("/cases/export/verify", { otp });
      if (res.data.ok) {
        const csv = [
          ["Case ID", "Customer", "Lead Type", "Assigned To", "Bank", "Branch", "Created At"],
          ...res.data.items.map((c) => [
            c.caseId,
            c.customerName,
            c.leadType,
            c.assignedTo?.name || "",
            c.bank,
            c.branch,
            new Date(c.createdAt).toLocaleString(),
          ]),
        ]
          .map((r) => r.join(","))
          .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cases_export.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(err.response?.data?.message || "Export failed");
    }
  };

  return (
    <div>
      <h1>Loan Cases</h1>

      {/* ✅ Export Button */}
      <button
        onClick={handleExport}
        style={{
          marginBottom: 10,
          padding: "6px 14px",
          background: "steelblue",
          color: "white",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
        }}
      >
        Export Cases (OTP Protected)
      </button>

      {/* ✅ Data Table */}
      <DataTable
        columns={[
          { header: "Sr. No", accessor: (r, i) => i + 1 },
          {
            header: "Case ID",
            accessor: (row) => (
              <Link to={`/cases/${row._id}/view`} style={{ color: "blue" }}>
                {row.caseId || "-"}
              </Link>
            ),
          },
          { header: "Customer Name", accessor: "customerName" },
          { header: "Lead Type", accessor: "leadType" },
          {
            header: "Assigned",
            accessor: (row) => {
              const current = getAssignedId(row);
              let assignedName = "Unassigned";

              if (typeof row.assignedTo === "object" && row.assignedTo?.name) {
                assignedName = row.assignedTo.name;
              } else if (typeof row.assignedTo === "string" && state.users.length > 0) {
                const match = state.users.find((u) => u._id === row.assignedTo);
                assignedName = match ? match.name : "Unassigned";
              }

              if (isAdmin) {
                return (
                  <select
                    value={current}
                    disabled={assigningId === row._id}
                    onChange={(e) => handleAssignChange(row, e.target.value)}
                    style={{ padding: 4, minWidth: 140 }}
                  >
                    <option value="">Unassigned</option>
                    {state.users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                );
              }

              return (
                <span
                  style={{
                    fontWeight: 500,
                    color: assignedName === "Unassigned" ? "gray" : "black",
                  }}
                >
                  {assignedName}
                </span>
              );
            },
          },
          {
            header: "Task",
            accessor: (row) => (
              <select
                value={row.task || ""}
                onChange={(e) => API.put(`/cases/${row._id}`, { task: e.target.value })}
                style={{ padding: 4, minWidth: 160 }}
              >
                <option value="">Select Task</option>
                <option value="Follow-up with customer">Follow-up with customer</option>
                <option value="Pending">Pending</option>
                <option value="In-progress">In-progress</option>
                <option value="Complete">Complete</option>
              </select>
            ),
          },
        ]}
        rows={state.items}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState((s) => ({ ...s, page: p }))}
        onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))} // ✅ search now linked
      />
    </div>
  );
}
