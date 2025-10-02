// client/src/pages/EditCustomer.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [disbursements, setDisbursements] = useState([]);
  const [newDisbursement, setNewDisbursement] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  useEffect(() => {
    loadCustomer();
    loadDisbursements();
  }, [id]);

  const loadCustomer = () => {
    API.get(`/customers/${id}`)
      .then((res) => setForm(res.data))
      .finally(() => setLoading(false));
  };

  const loadDisbursements = () => {
    API.get(`/customers/${id}/disbursements`)
      .then((res) => setDisbursements(res.data))
      .catch(() => setDisbursements([]));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validate status change to "close"
    if (name === "status" && value === "close") {
      const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
      if (totalDisbursed <= 0) {
        alert("❌ Cannot close customer without disbursement amount. Please add at least one disbursement.");
        return; // Prevent changing to close
      }
    }
    
    setForm({ ...form, [name]: value });
  };

  const handleDisbursementChange = (e) => {
    setNewDisbursement({
      ...newDisbursement,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation before saving
    if (form.status === "close") {
      const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
      if (totalDisbursed <= 0) {
        alert("❌ Cannot save with status 'Close' without disbursement amount. Please add at least one disbursement.");
        return;
      }
    }

    try {
      await API.put(`/customers/${id}`, form);
      alert("✅ Customer details saved successfully!");
      navigate(`/customers/${id}`);
    } catch (err) {
      alert("❌ Failed to save changes");
    }
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
        amount: parseFloat(newDisbursement.amount)
      });
      
      setNewDisbursement({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      
      loadDisbursements();
      loadCustomer(); // Refresh customer data to update total disbursed
      alert("✅ Disbursement added successfully!");
    } catch (error) {
      alert("❌ Failed to add disbursement");
    }
  };

  const deleteDisbursement = async (disbursementId) => {
    if (!window.confirm("Are you sure you want to delete this disbursement?")) {
      return;
    }

    // Check if customer is closed
    if (form.status === 'close') {
      alert("❌ Cannot delete disbursement from closed customer.");
      return;
    }

    try {
      await API.delete(`/customers/${id}/disbursements/${disbursementId}`);
      loadDisbursements();
      loadCustomer();
      alert("✅ Disbursement deleted successfully!");
    } catch (error) {
      alert("❌ Failed to delete disbursement");
    }
  };

  if (loading) return <div className="card">Loading...</div>;

  const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
  const isCustomerClosed = form.status === 'close';

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto" }}>
      {/* Customer Details Card */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "20px" }}>Edit Customer</h2>
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
            <option value="close">Close</option>
          </select>

          {/* Show warning if trying to close without disbursement */}
          {form.status === "close" && totalDisbursed <= 0 && (
            <div style={{
              background: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "4px",
              padding: "10px",
              margin: "10px 0",
              color: "#856404"
            }}>
              ⚠️ <strong>Warning:</strong> You cannot close this customer without adding disbursement amount. Please add disbursement below.
            </div>
          )}

          {/* Show info if customer is closed */}
          {form.status === "close" && totalDisbursed > 0 && (
            <div style={{
              background: "#d1ecf1",
              border: "1px solid #bee5eb",
              borderRadius: "4px",
              padding: "10px",
              margin: "10px 0",
              color: "#0c5460"
            }}>
              ✅ <strong>Customer Closed:</strong> This customer has been closed with total disbursement of ₹{totalDisbursed.toLocaleString()}.
            </div>
          )}

          {/* Button row */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              className="btn secondary"
              type="button"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button 
              className="btn success" 
              type="submit"
              disabled={form.status === "close" && totalDisbursed <= 0}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Disbursements Card */}
      <div className="card">
        <h3 style={{ marginBottom: "20px" }}>
          Disbursement Management
          <span style={{ float: "right", fontSize: "1rem", color: "#666" }}>
            Total Disbursed: <strong>₹{totalDisbursed.toLocaleString()}</strong>
          </span>
        </h3>

        {/* Status Alert */}
        {isCustomerClosed && (
          <div style={{
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            padding: "10px",
            marginBottom: "20px",
            color: "#721c24"
          }}>
            🔒 <strong>Customer Closed:</strong> No further disbursements can be added or deleted.
          </div>
        )}

        {/* Add New Disbursement Form */}
        {!isCustomerClosed && (
          <form onSubmit={addDisbursement} style={{ marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
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

        {/* Disbursements List */}
        {disbursements.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>Date</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Amount</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Notes</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disbursements.map((disbursement) => (
                <tr key={disbursement._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>
                    {new Date(disbursement.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "8px" }}>
                    ₹{disbursement.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {disbursement.notes || "-"}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <button
                      className="btn danger"
                      onClick={() => deleteDisbursement(disbursement._id)}
                      style={{ padding: "4px 8px" }}
                      disabled={isCustomerClosed}
                      title={isCustomerClosed ? "Cannot delete from closed customer" : "Delete disbursement"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No disbursements recorded yet.
            {!isCustomerClosed && " Use the form above to add the first disbursement."}
          </p>
        )}
      </div>
    </div>
  );
}