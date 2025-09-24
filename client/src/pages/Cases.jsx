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
    users: [], // 👈 store assignable users
  });
  const [assigningId, setAssigningId] = useState(null);

  const load = () =>
    API.get("/cases", { params: { page: state.page, q: state.q } }).then((r) =>
      setState((s) => ({ ...s, items: r.data.items, pages: r.data.pages }))
    );

  // Load active users once (who are playing roles on this project)
  const loadUsers = async () => {
    try {
      const res = await API.get("/users", { params: { active: true } });
      const data = res.data;
      const users = Array.isArray(data) ? data : (data.items || []);
      setState((s) => ({ ...s, users }));
    } catch (e) {
      const res = await API.get("/users");
      const data = res.data;
      const users = Array.isArray(data) ? data : (data.items || []);
      setState((s) => ({ ...s, users }));
    }
  };

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  useEffect(() => {
    loadUsers();
  }, []);

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

  const comment = async (row) => {
    const c = prompt("Comment");
    if (c) {
      await API.post(`/cases/${row._id}/comment`, { comment: c });
      alert("Comment added");
    }
  };

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

  const handleAssignChange = async (row, userId) => {
    try {
      setAssigningId(row._id);
      await API.put(`/cases/${row._id}`, {
        ...row,
        assignedTo: userId || null, // empty -> unassign
      });
      await load();
    } finally {
      setAssigningId(null);
    }
  };

  // Helper to get current assigned user id from row (supports ObjectId or populated object)
  const getAssignedId = (row) => {
    if (!row?.assignedTo) return "";
    return typeof row.assignedTo === "object" ? row.assignedTo._id : row.assignedTo;
  };

  // Helper to get current assigned user name for export
  const getAssignedName = (row) => {
    return (
      row?.assignedTo?.name ||
      row?.assignedName ||
      state.users.find((u) => u._id === getAssignedId(row))?.name ||
      ""
    );
  };

  return (
    <div>
      <header><h1>Loan Cases</h1></header>
      <DataTable
        columns={[
          {
            header: "Case ID",
            accessor: (row) => (
              <Link to={`/cases/${row._id}/view`} style={{ color: "blue" }}>
                {row.caseId}
              </Link>
            ),
          },
          { header: "Customer Name", accessor: "customerName" },
          { header: "Mobile", accessor: "mobile" },
          { header: "Loan Type", accessor: "loanType" },

          // 🔁 Assigned column (select from User Management)
          {
            header: "Assigned",
            accessor: (row, _i, exportMode) => {
              if (exportMode) return getAssignedName(row); // ✅ keeps Excel export working
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
                      {u.name} {/* ✅ only name, no role */}
                    </option>
                  ))}
                </select>
              );
            },
          },

          // ✅ Task column (dropdown with fixed options)
          {
            header: "Task",
            accessor: (row, _i, exportMode) => {
              if (exportMode) return row.task || "";

              const handleTaskChange = async (value) => {
                await API.put(`/cases/${row._id}`, {
                  ...row,
                  task: value,
                });
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
            <button className="btn" onClick={() => changeStatus(row)}>Change Status</button>
            <button className="btn secondary" onClick={() => comment(row)}>Comment</button>
            <button className="btn" onClick={() => viewAudit(row)}>View Audit</button>
          </div>
        )}
      />
    </div>
  );
}
