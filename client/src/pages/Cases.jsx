import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";
import * as XLSX from "xlsx"; // ✅ for Excel export

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

  const load = useCallback(async () => {
    if (isLoading) return;
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
      setState((s) => ({ ...s, items, pages }));
    } catch (err) {
      console.error("Failed to load cases:", err);
      alert("❌ Could not load cases.");
    } finally {
      setIsLoading(false);
    }
  }, [state.page, state.q, state.filterAssigned, state.filterTask, isLoading]);

  useEffect(() => {
    load();
  }, [load]);

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
      setLocalAssignments((prev) => ({ ...prev, [row._id]: undefined }));
      load();
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

  const [amountTimeouts, setAmountTimeouts] = useState({});

  const handleAmountChange = async (row, value) => {
    const caseId = row._id;
    if (amountTimeouts[caseId]) clearTimeout(amountTimeouts[caseId]);
    setState((s) => ({
      ...s,
      items: s.items.map((item) =>
        item._id === caseId
          ? { ...item, amount: value === "" ? null : Number(value) }
          : item
      ),
    }));

    const timeoutId = setTimeout(async () => {
      try {
        const payload = { amount: value === "" ? null : Number(value) };
        await API.put(`/cases/${caseId}`, payload);
        console.log("✅ Amount updated successfully");
      } catch (error) {
        console.error("Amount update failed:", error);
        alert("Amount update failed!");
      }
    }, 1000);
    setAmountTimeouts((prev) => ({ ...prev, [caseId]: timeoutId }));
  };

  /* ---------------------- ✅ EXPORT CASES ---------------------- */
  const handleExport = async () => {
    try {
      const { data } = await API.post("/cases/export/request-otp");
      alert(
        `OTP sent to owner's email.\n\nRequested by: ${data.requester.name} (${data.requester.email})\nIP: ${data.requester.ip}`
      );

      const otp = prompt("Enter the OTP sent to owner's email:");
      if (!otp) return alert("OTP is required.");

      const verify = await API.post("/cases/export/verify", { otp });
      if (verify.data.ok && verify.data.items) {
        const rows = verify.data.items;
        const ws = XLSX.utils.json_to_sheet(
          rows.map((r) => ({
            "Case ID": r.caseId || "",
            "Customer Name": r.customerName || "",
            "Lead Type": r.leadType || "",
            "Assigned To": r.assignedTo?.name || "",
            Bank: r.bank || "",
            Branch: r.branch || "",
            Amount: r.amount || "",
            "Created At": new Date(r.createdAt).toLocaleString(),
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cases Export");
        XLSX.writeFile(wb, `cases_export_${Date.now()}.xlsx`);
        alert("✅ Export completed successfully!");
      } else {
        alert("OTP verification failed.");
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert(err.response?.data?.message || "Export failed!");
    }
  };

  /* ---------------------- ✅ UI ---------------------- */
  return (
    <div>
      <header>
        <h1>Loan Cases</h1>
      </header>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Filters */}
        <select
          value={state.filterAssigned}
          onChange={(e) =>
            setState((s) => ({ ...s, filterAssigned: e.target.value, page: 1 }))
          }
          style={{ padding: 6, minWidth: 180, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="">All Assigned</option>
          {state.users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={state.filterTask}
          onChange={(e) =>
            setState((s) => ({ ...s, filterTask: e.target.value, page: 1 }))
          }
          style={{ padding: 6, minWidth: 180, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="">All Tasks</option>
          <option value="Follow-up with customer">Follow-up with customer</option>
          <option value="Pending">Pending</option>
          <option value="In-progress">In-progress</option>
          <option value="Complete">Complete</option>
        </select>

        {/* Reset */}
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

        {/* ✅ Export Button */}
        <button
          onClick={handleExport}
          style={{
            padding: "6px 12px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Export Cases
        </button>
      </div>

      <DataTable
        columns={[
          { header: "Sr. No", accessor: (row, i) => i + 1 },
          {
            header: "Case ID",
            accessor: (row) => (
              <Link to={`/cases/${row._id}/view`} style={{ color: "blue" }}>
                {row.caseId || "-"}
              </Link>
            ),
          },
          { header: "Customer Name", accessor: "customerName" },
          { header: "Mobile", accessor: "mobile" },
          { header: "Lead Type", accessor: "leadType" },
          {
            header: "Assigned",
            accessor: (row) => {
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
          {
            header: "Task",
            accessor: (row) => (
              <select
                value={row.task || ""}
                onChange={(e) =>
                  API.put(`/cases/${row._id}`, { task: e.target.value }).then(() =>
                    load()
                  )
                }
                style={{ padding: 4, minWidth: 140 }}
              >
                <option value="">Select Task</option>
                <option value="Follow-up with customer">Follow-up with customer</option>
                <option value="Pending">Pending</option>
                <option value="In-progress">In-progress</option>
                <option value="Complete">Complete</option>
              </select>
            ),
          },
          {
            header: "Sanctioned Amount",
            accessor: (row) => (
              <input
                type="number"
                value={row.amount ?? ""}
                onChange={(e) => handleAmountChange(row, e.target.value)}
                style={{ padding: 4, width: 120 }}
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
