// client/src/pages/Cases.jsx
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

  // 🔹 Load cases with filters (useCallback to prevent unnecessary recreations)
  const load = useCallback(async () => {
    if (isLoading) return; // Prevent concurrent calls
    
    setIsLoading(true);
    try {
      const { data } = await API.get("/cases", {
        params: {
          page: state.page,
          q: state.q,
          assignedTo: state.filterAssigned || undefined,
          task: state.filterTask || undefined,
        },
      });

      const items = Array.isArray(data) ? data : data.items || [];
      const pages = Array.isArray(data) ? 1 : data.pages || 1;
      
      // ✅ Preserve local assignments during reload
      setState((s) => ({ ...s, items, pages }));
    } catch (err) {
      console.error("Failed to load cases:", err);
      alert("❌ Could not load cases. Check console.");
    } finally {
      setIsLoading(false);
    }
  }, [state.page, state.q, state.filterAssigned, state.filterTask, isLoading]);

  // 🔹 Load users for assignment + filter
    const loadUsers = async () => {
      try {
        const res = await API.get("/users");
        const data = res.data;
        const users = Array.isArray(data) ? data : data.items || [];
        setState((s) => ({ ...s, users }));
      } catch (err) {
        console.error("User load failed:", err);
        alert("Failed to load users");
      }
    };


  // ✅ Optimized useEffect with proper dependencies
  useEffect(() => {
    load();
  }, [load]); // Now only re-runs when load function changes

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

  // 🔹 Assign user (Optimistic Update)
  const handleAssignChange = async (row, userId) => {
    try {
      setAssigningId(row._id);

      // ✅ Update instantly on UI
      setLocalAssignments((prev) => ({ ...prev, [row._id]: userId || null }));
      setState((s) => ({
        ...s,
        items: s.items.map((item) =>
          item._id === row._id ? { ...item, assignedTo: userId || null } : item
        ),
      }));

      await API.put(`/cases/${row._id}`, { assignedTo: userId || null });
    } catch (error) {
      console.error("Assignment failed:", error);
      alert(`Assignment failed: ${error.response?.data?.message || error.message}`);
      
      // ✅ Revert on error
      setLocalAssignments((prev) => ({ ...prev, [row._id]: undefined }));
      load(); // Reload to get correct state
    } finally {
      setAssigningId(null);
    }
  };

  // ✅ Helper to extract Assigned ID
  const getAssignedId = (row) => {
    if (localAssignments[row._id] !== undefined)
      return localAssignments[row._id] || "";
    if (!row?.assignedTo) return "";
    if (typeof row.assignedTo === "object") return row.assignedTo._id || "";
    if (typeof row.assignedTo === "string") return row.assignedTo;
    return "";
  };

  // ✅ Debounced amount update to prevent race conditions
  const [amountTimeouts, setAmountTimeouts] = useState({});

  const handleAmountChange = async (row, value) => {
    const caseId = row._id;
    
    // Clear existing timeout for this case
    if (amountTimeouts[caseId]) {
      clearTimeout(amountTimeouts[caseId]);
    }

    // ✅ Optimistic UI update immediately
    setState((s) => ({
      ...s,
      items: s.items.map((item) =>
        item._id === caseId ? { ...item, amount: value === "" ? null : Number(value) } : item
      ),
    }));

    // Set new timeout for API call
    const timeoutId = setTimeout(async () => {
      try {
        const payload = {
          amount: value === "" ? null : Number(value),
        };
        
        await API.put(`/cases/${caseId}`, payload);
        console.log("✅ Amount updated successfully");
      } catch (error) {
        console.error("Amount update failed:", error);
        // Revert on error
        setState((s) => ({
          ...s,
          items: s.items.map((item) =>
            item._id === caseId ? { ...item, amount: row.amount } : item
          ),
        }));
        alert("Amount update failed!");
      }
    }, 1000); // 1 second delay

    setAmountTimeouts((prev) => ({
      ...prev,
      [caseId]: timeoutId
    }));
  };

  return (
    <div>
      <header>
        <h1>Loan Cases</h1>
      </header>

      {/* ✅ Filter section */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Assigned Filter */}
        <select
          value={state.filterAssigned}
          onChange={(e) =>
            setState((s) => ({ ...s, filterAssigned: e.target.value, page: 1 }))
          }
          style={{
            padding: 6,
            minWidth: 180,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          <option value="">All Assigned</option>
          {state.users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Task Filter */}
        <select
          value={state.filterTask}
          onChange={(e) =>
            setState((s) => ({ ...s, filterTask: e.target.value, page: 1 }))
          }
          style={{
            padding: 6,
            minWidth: 180,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          <option value="">All Tasks</option>
          <option value="Follow-up with customer">Follow-up with customer</option>
          <option value="Pending">Pending</option>
          <option value="In-progress">In-progress</option>
          <option value="Complete">Complete</option>
        </select>

        {/* ✅ Reset Button */}
        <button
          onClick={() =>
            setState((s) => ({
              ...s,
              filterAssigned: "",
              filterTask: "",
              page: 1,
            }))
          }
          style={{
            padding: "6px 12px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* ✅ Data Table */}
      <DataTable
        columns={[
          {
            header: "Sr. No",
            accessor: (row, index, exportMode) =>
              exportMode ? index + 1 : index + 1,
          },
          {
            header: "Case ID",
            accessor: (row, index, exportMode) =>
              exportMode ? row.caseId || "-" : (
                <Link to={`/cases/${row._id}/view`} style={{ color: "blue" }}>
                  {row.caseId || "-"}
                </Link>
              ),
          },
          { header: "Customer Name", accessor: "customerName" },
          { header: "Mobile", accessor: "mobile" },

          // ✅ Lead Type column
          { header: "Lead Type", accessor: "leadType" },

          // Assigned column
          {
            header: "Assigned",
            accessor: (row) => {
              const current = getAssignedId(row);
              return (
                <select
                  value={current}
                  disabled={assigningId === row._id}
                  onChange={(e) => handleAssignChange(row, e.target.value)}
                  style={{
                    padding: 4,
                    minWidth: 140,
                    opacity: assigningId === row._id ? 0.7 : 1,
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
            accessor: (row) => {
              const handleTaskChange = async (value) => {
                try {
                  // ✅ Optimistic UI update
                  setState((s) => ({
                    ...s,
                    items: s.items.map((item) =>
                      item._id === row._id ? { ...item, task: value } : item
                    ),
                  }));

                  await API.put(`/cases/${row._id}`, { task: value });
                } catch (err) {
                  console.error("Task update failed:", err);
                  alert("Task update failed!");
                }
              };
              return (
                <select
                  value={row.task || ""}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  style={{ padding: 4, minWidth: 160 }}
                >
                  <option value="">Select Task</option>
                  <option value="Follow-up with customer">
                    Follow-up with customer
                  </option>
                  <option value="Pending">Pending</option>
                  <option value="In-progress">In-progress</option>
                  <option value="Complete">Complete</option>
                </select>
              );
            },
          },

          // ✅ Sanctioned Amount (manual, supports blank, debounced save)
          {
            header: "Sanctioned Amount",
            accessor: (row) => (
              <input
                type="number"
                inputMode="decimal"
                value={row.amount ?? ""} // stays blank if null/undefined
                onChange={(e) => handleAmountChange(row, e.target.value)}
                placeholder="Enter amount"
                style={{
                  padding: 4,
                  minWidth: 120,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
            ),
          },
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