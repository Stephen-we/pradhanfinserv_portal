// client/src/pages/EditCustomer.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🧑‍💼 Role-based access control
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role;

  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  // Disbursement list + add-new form
  const [disbursements, setDisbursements] = useState([]);
  const [newDisbursement, setNewDisbursement] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    // 🚫 Block unauthorized users
    if (!["admin", "superadmin"].includes(userRole)) return;
    loadCustomer();
    loadDisbursements();
  }, [id, userRole]);

  const loadCustomer = async () => {
    try {
      const { data } = await API.get(`/customers/${id}`);
      setForm(data);
    } finally {
      setLoading(false);
    }
  };

  const loadDisbursements = async () => {
    try {
      const { data } = await API.get(`/customers/${id}/disbursements`);
      setDisbursements(Array.isArray(data) ? data : []);
    } catch {
      setDisbursements([]);
    }
  };

  const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
  const isCustomerClosed = form.status === "close";
  const canClose = totalDisbursed > 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "status" && value === "close" && !canClose) {
      alert(
        "❌ Cannot set status to 'Close' without a disbursement. Please add a disbursement first."
      );
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.status === "close" && !canClose) {
      alert("❌ Cannot save with status 'Close' without disbursement.");
      return;
    }

    try {
      await API.put(`/customers/${id}`, form);
      alert("✅ Customer details saved successfully!");
      navigate(`/customers/${id}`);
    } catch {
      alert("❌ Failed to save changes");
    }
  };

  const handleDisbursementChange = (e) => {
    setNewDisbursement((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addDisbursement = async (e) => {
    e.preventDefault();
    if (!newDisbursement.amount) {
      alert("Please enter disbursement amount");
      return;
    }

    try {
      await API.post(`/customers/${id}/disbursements`, {
        ...newDisbursement,
        amount: parseFloat(newDisbursement.amount),
      });

      setNewDisbursement({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });

      await loadDisbursements();
      await loadCustomer();
      alert("✅ Disbursement added successfully!");
    } catch {
      alert("❌ Failed to add disbursement");
    }
  };

  const deleteDisbursement = async (disbursementId) => {
    if (!window.confirm("Are you sure you want to delete this disbursement?")) return;
    if (isCustomerClosed) {
      alert("❌ Cannot delete disbursement from a closed customer.");
      return;
    }
    try {
      await API.delete(`/customers/${id}/disbursements/${disbursementId}`);
      await loadDisbursements();
      await loadCustomer();
      alert("✅ Disbursement deleted successfully!");
    } catch {
      alert("❌ Failed to delete disbursement");
    }
  };

  // 🚫 Unauthorized View
  if (!["admin", "superadmin"].includes(userRole)) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "80px",
          background: "#fff",
          maxWidth: "500px",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          marginInline: "auto",
        }}
      >
        <h2 style={{ color: "#dc2626" }}>Access Denied</h2>
        <p style={{ color: "#555", marginBottom: "20px" }}>
          You don’t have permission to edit customer details.<br />
          Please contact your administrator.
        </p>
        <button
          onClick={() => navigate(`/customers/${id}`)}
          className="btn secondary"
        >
          ← Back to Customer View
        </button>
      </div>
    );
  }

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div style={{ maxWidth: "900px", margin: "20px auto" }}>
      {/* Customer Details */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16 }}>Edit Customer</h2>

        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            className="input"
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            required
          />

          <label>Mobile</label>
          <input
            className="input"
            name="mobile"
            value={form.mobile || ""}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            className="input"
            type="email"
            name="email"
            value={form.email || ""}
            onChange={handleChange}
          />

          <label>Status</label>
          <select
            className="input"
            name="status"
            value={form.status || "open"}
            onChange={handleChange}
          >
            <option value="open">Open</option>
            <option value="close" disabled={!canClose}>
              Close
            </option>
          </select>

          {!canClose && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffeaa7",
                borderRadius: 6,
                padding: 10,
                marginTop: 10,
                color: "#856404",
              }}
            >
              ⚠️ You can only mark this customer as <b>Close</b> after adding at least one disbursement below.
            </div>
          )}

          {form.status === "close" && canClose && (
            <div
              style={{
                background: "#d1ecf1",
                border: "1px solid #bee5eb",
                borderRadius: 6,
                padding: 10,
                marginTop: 10,
                color: "#0c5460",
              }}
            >
              ✅ This customer is marked <b>Close</b>. Total disbursed:{" "}
              <b>₹{disbursements.reduce((s, d) => s + d.amount, 0).toLocaleString()}</b>.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button className="btn secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="btn success" type="submit" disabled={form.status === "close" && !canClose}>
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Disbursements */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>
          Disbursement Management
          <span style={{ float: "right", fontSize: "1rem", color: "#666" }}>
            Total Disbursed:{" "}
            <strong>₹{disbursements.reduce((s, d) => s + d.amount, 0).toLocaleString()}</strong>
          </span>
        </h3>

        {!isCustomerClosed && (
          <form onSubmit={addDisbursement} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={newDisbursement.amount}
                  onChange={handleDisbursementChange}
                  className="input"
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
              </div>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={newDisbursement.date}
                  onChange={handleDisbursementChange}
                  className="input"
                />
              </div>
              <div>
                <label>Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={newDisbursement.notes}
                  onChange={handleDisbursementChange}
                  className="input"
                  placeholder="Optional notes"
                />
              </div>
              <div>
                <button type="submit" className="btn success">
                  Add Disbursement
                </button>
              </div>
            </div>
          </form>
        )}

        {disbursements.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                <th style={{ textAlign: "left", padding: 8 }}>Amount</th>
                <th style={{ textAlign: "left", padding: 8 }}>Notes</th>
                <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...disbursements]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((d) => (
                  <tr key={d._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 8 }}>
                      {new Date(d.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 8 }}>₹{d.amount.toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{d.notes || "-"}</td>
                    <td style={{ padding: 8 }}>
                      <button
                        className="btn danger"
                        onClick={() => deleteDisbursement(d._id)}
                        style={{ padding: "4px 8px" }}
                        disabled={isCustomerClosed}
                        title={
                          isCustomerClosed
                            ? "Cannot delete from closed customer"
                            : "Delete disbursement"
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "#666", padding: 20 }}>
            No disbursements recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
