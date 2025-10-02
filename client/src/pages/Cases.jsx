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
  const [localAssignments, setLocalAssignments] = useState({}); // Track local assignments

  // 🔹 Load cases with safe handling
  const load = async () => {
    try {
      const { data } = await API.get("/cases", {
        params: { page: state.page, q: state.q },
      });

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

  // 🔹 FIXED: Assign user with proper state management
  const handleAssignChange = async (row, userId) => {
    try {
      setAssigningId(row._id);

      // Store the assignment locally immediately
      setLocalAssignments(prev => ({
        ...prev,
        [row._id]: userId || null
      }));

      const payload = { assignedTo: userId || null };
      await API.put(`/cases/${row._id}`, payload);
      
      // After successful API call, reload to sync with server
      await load();
      
    } catch (error) {
      console.error("Assignment failed:", error);
      
      // Remove local assignment on error
      setLocalAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[row._id];
        return newAssignments;
      });
      
      alert(`Assignment failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setAssigningId(null);
    }
  };

  // FIXED: Enhanced helper functions that check local assignments first
  const getAssignedId = (row) => {
    // Check local assignments first (for immediate UI update)
    if (localAssignments[row._id] !== undefined) {
      return localAssignments[row._id] || "";
    }
    
    // Then check the actual data from API
    if (!row?.assignedTo) return "";
    
    if (typeof row.assignedTo === 'object') {
      return row.assignedTo._id || "";
    }
    
    if (typeof row.assignedTo === 'string') {
      return row.assignedTo;
    }
    
    return "";
  };

  const getAssignedName = (row) => {
    const assignedId = getAssignedId(row);
    
    // If we have a local assignment, show the user name immediately
    if (localAssignments[row._id] && localAssignments[row._id] !== "") {
      const user = state.users.find(u => u._id === localAssignments[row._id]);
      return user?.name || "";
    }
    
    // Otherwise use the normal logic
    if (row?.assignedTo?.name) return row.assignedTo.name;
    if (row?.assignedName) return row.assignedName;
    
    if (assignedId) {
      const user = state.users.find((u) => u._id === assignedId);
      return user?.name || "";
    }
    
    return "";
  };

  return (
    <div>
      <header>
        <h1>Loan Cases</h1>
      </header>
      <DataTable
        columns={[
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

          // FIXED: Assigned column with stable local state
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
                  style={{ 
                    padding: 4, 
                    minWidth: 140,
                    // Visual feedback for loading state
                    opacity: assigningId === row._id ? 0.7 : 1
                  }}
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