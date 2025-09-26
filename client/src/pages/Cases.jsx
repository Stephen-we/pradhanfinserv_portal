// client/src/pages/Cases.jsx
import React, { useEffect, useState } from "react";
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
  });
  const [assigningId, setAssigningId] = useState(null);

  // 🔹 Load cases with safe handling
  const load = async () => {
    try {
      const { data } = await API.get("/cases", {
        params: { page: state.page, q: state.q },
      });
      console.log("Cases API response:", data);

      const items = Array.isArray(data) ? data : data.items || [];
      const pages = Array.isArray(data) ? 1 : data.pages || 1;

      setState((s) => ({ ...s, items, pages }));
    } catch (err) {
      console.error("Failed to load cases:", err);
      alert("❌ Could not load cases. Check console.");
    }
  };

  // 🔹 Load users for assignment
  const loadUsers = async () => {
    try {
      const res = await API.get("/users", { params: { active: true } });
      const data = res.data;
      const users = Array.isArray(data) ? data : data.items || [];
      setState((s) => ({ ...s, users }));
    } catch {
      const res = await API.get("/users");
      const data = res.data;
      const users = Array.isArray(data) ? data : data.items || [];
      setState((s) => ({ ...s, users }));
    }
  };

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔹 Change case status
  const changeStatus = async (row) => {
    const status = prompt(
      "New status (in-progress, pending-documents, approved, rejected, disbursed)",
      row.status
    );
    if (status) {
      await API.put(`/cases/${row._id}`, { ...row, status });
      load();
    }
  };

  // 🔹 Add comment
  const comment = async (row) => {
    const c = prompt("Comment");
    if (c) {
      await API.post(`/cases/${row._id}/comment`, { comment: c });
      alert("Comment added");
    }
  };

  // 🔹 View audit trail
  const viewAudit = async (row) => {
    const { data } = await API.get(`/cases/${row._id}/audit`);
    alert(
      data
        .map(
          (a) =>
            `${new Date(a.createdAt).toLocaleString()} - ${a.action}${
              a.fromStatus ? ` ${a.fromStatus}→${a.toStatus}` : ""
            } ${a.comment ? `- ${a.comment}` : ""} by ${a.actor?.name || ""}`
        )
        .join("\n") || "No logs"
    );
  };

  // 🔹 Assign user
  const handleAssignChange = async (row, userId) => {
    try {
      setAssigningId(row._id);
      await API.put(`/cases/${row._id}`, {
        ...row,
        assignedTo: userId || null,
      });
      await load();
    } finally {
      setAssigningId(null);
    }
  };

  // Helpers
  const getAssignedId = (row) => {
    if (!row?.assignedTo) return "";
    return typeof row.assignedTo === "object" ? row.assignedTo._id : row.assignedTo;
  };

  const getAssignedName = (row) =>
    row?.assignedTo?.name ||
    row?.assignedName ||
    state.users.find((u) => u._id === getAssignedId(row))?.name ||
    "";

  return (
    <div>
      <header>
        <h1>Loan Cases</h1>
      </header>
      <DataTable
        columns={[
          // 🔹 Added Sr. No column
          {
            header: "Sr. No",
            accessor: (row, index, exportMode) => {
              if (exportMode) return index + 1;
              return index + 1;
            },
          },
          {
            header: "Case ID",
            accessor: (row, index, exportMode) => {
              if (exportMode) return row.caseId || "-";
              return (
                <Link to={`/cases/${row._id}/view`} style={{ color: "blue" }}>
                  {row.caseId || "-"}
                </Link>
              );
            },
          },
          { header: "Customer Name", accessor: "customerName" },
          { header: "Mobile", accessor: "mobile" },
          { header: "Loan Type", accessor: "loanType" },

          // Assigned column
          {
            header: "Assigned",
            accessor: (row, index, exportMode) => {
              if (exportMode) return getAssignedName(row);
              const current = getAssignedId(row);
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
            },
          },

          // Task column
          {
            header: "Task",
            accessor: (row, index, exportMode) => {
              if (exportMode) return row.task || "";
              const handleTaskChange = async (value) => {
                await API.put(`/cases/${row._id}`, { ...row, task: value });
                load();
              };
              return (
                <select
                  value={row.task || ""}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  style={{ padding: 4, minWidth: 160 }}
                >
                  <option value="">Select Task</option>
                  <option value="Follow-up with customer">Follow-up with customer</option>
                  <option value="Pending">Pending</option>
                  <option value="In-progress">In-progress</option>
                  <option value="Complete">Complete</option>
                </select>
              );
            },
          },

          { header: "Disbursed Amount", accessor: "disbursedAmount" },
        ]}
        rows={state.items}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState((s) => ({ ...s, page: p }))}
        onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))}
        renderActions={(row) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" onClick={() => changeStatus(row)}>
              Change Status
            </button>
            <button className="btn secondary" onClick={() => comment(row)}>
              Comment
            </button>
            <button className="btn" onClick={() => viewAudit(row)}>
              View Audit
            </button>
          </div>
        )}
      />
    </div>
  );
}