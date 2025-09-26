// client/src/pages/Branches
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Branches() {
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const [form, setForm] = useState({
    bankName: "",
    branchName: "",
    managerNumber: "",
  });

  const [deleteTarget, setDeleteTarget] = useState(null); // ✅ for modal
  const navigate = useNavigate();
  const role = (JSON.parse(localStorage.getItem("user") || "{}").role) || "";

  const load = () =>
    API.get("/branches", {
      params: { page: state.page, q: state.q },
    }).then((r) =>
      setState((s) => ({
        ...s,
        items: r.data.items,
        pages: r.data.pages,
      }))
    );

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  const add = async () => {
    if (!form.bankName || !form.branchName) {
      alert("Please select bank and branch");
      return;
    }
    if (!/^\d{10}$/.test(form.managerNumber)) {
      alert("Manager number must be exactly 10 digits");
      return;
    }
    await API.post("/branches", form);
    setForm({ bankName: "", branchName: "", managerNumber: "" });
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/branches/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } catch {
      alert("Error deleting branch");
    }
  };

  const banks = ["BOM", "SBI", "HDFC", "ICICI", "AXIS", "PNB"];
  const puneBranches = [
    "Vishrantwadi",
    "Vimannagar",
    "Vadgaon",
    "Viman Nagar",
    "Kharadi",
    "Mundhwa Pune",
    "Shivaji Nagar",
    "Lohegaon",
    "Hadapsar",
  ];

  return (
    <div>
      <header>
        <h1>Bank Branches</h1>
      </header>

      <div className="card">
        <div className="toolbar">
          {/* Bank dropdown */}
          <select
            className="input"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          >
            <option value="">-- Select Bank --</option>
            {banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Branch dropdown */}
          <input
            list="branchOptions"
            className="input"
            placeholder="Branch (type e.g. V...)"
            value={form.branchName}
            onChange={(e) => setForm({ ...form, branchName: e.target.value })}
          />
          <datalist id="branchOptions">
            {puneBranches.map((br) => (
              <option key={br} value={br} />
            ))}
          </datalist>

          {/* Manager Number - restricted to 10 digits */}
          <input
            className="input"
            type="tel"
            placeholder="Manager Number"
            value={form.managerNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, ""); // digits only
              if (val.length <= 10) {
                setForm({ ...form, managerNumber: val });
              }
            }}
            pattern="[0-9]{10}"
            title="Please enter a 10-digit number"
            required
          />

          <button className="btn" onClick={add}>
            + Add Branch
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          {
            header: "Sr.No.",
            accessor: (row, i) => (state.page - 1) * 10 + i + 1,
          },
          {
            header: "Branch ID",
            accessor: (row, i, exportMode) =>
              exportMode ? (
                row.branchId
              ) : (
                <span
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => navigate(`/branches/${row._id}/view`)}
                >
                  {row.branchId}
                </span>
              ),
          },
          { header: "Bank Name", accessor: "bankName" },
          { header: "Branch Name", accessor: "branchName" },
          { header: "Manager Number", accessor: "managerNumber" },
          {
            header: "Actions",
            accessor: (row) => (
              <div style={{ display: "flex", gap: 8 }}>
                {(role === "admin" || role === "superadmin") && (
                  <button
                    className="btn danger"
                    onClick={() => setDeleteTarget(row)} // open modal
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

      {/* ✅ Custom Delete Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal red">
            <h3>⚠️ Confirm Delete</h3>
            <p>
              Are you sure you want to delete{" "}
              <b>{deleteTarget.branchName}</b> ({deleteTarget.branchId})?
            </p>
            <div className="actions">
              <button
                className="btn secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
