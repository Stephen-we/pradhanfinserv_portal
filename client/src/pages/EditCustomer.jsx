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

  // Edit state for disbursements
  const [editingDisbursement, setEditingDisbursement] = useState(null);
  const [editAmount, setEditAmount] = useState("");

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
    } catch (error) {
      console.error("Error loading customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisbursements = async () => {
    try {
      const { data } = await API.get(`/customers/${id}/disbursements`);
      setDisbursements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading disbursements:", error);
      setDisbursements([]);
    }
  };

  const totalDisbursed = disbursements.reduce((sum, d) => sum + (d.amount || 0), 0);
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
    } catch (error) {
      console.error("Error saving customer:", error);
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

    // Check if customer status is open and disbursement amount is being added
    if (form.status === "open" && parseFloat(newDisbursement.amount) > 0) {
      const shouldClose = window.confirm(
        "⚠️ You are adding a disbursement amount while customer status is 'Open'.\n\n" +
        "Do you want to change customer status to 'Close' before adding this disbursement?\n\n" +
        "Click OK to change status to 'Close' and add disbursement.\n" +
        "Click Cancel to keep status as 'Open' and cancel disbursement addition."
      );
      
      if (shouldClose) {
        // Update status to close and then add disbursement
        try {
          // First update customer status to close
          await API.put(`/customers/${id}`, { ...form, status: "close" });
          setForm(prev => ({ ...prev, status: "close" }));
          
          // Then add the disbursement
          const response = await API.post(`/customers/${id}/disbursements`, {
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
          alert("✅ Customer status changed to 'Close' and disbursement added successfully!");
          return;
        } catch (error) {
          console.error("Error updating status and adding disbursement:", error);
          alert("❌ Failed to update status and add disbursement");
          return;
        }
      } else {
        // User cancelled - don't add disbursement
        alert("❌ Disbursement addition cancelled. Customer status remains 'Open'.");
        return;
      }
    }

    // Normal disbursement addition (when status is already close or amount is zero)
    try {
      const response = await API.post(`/customers/${id}/disbursements`, {
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
    } catch (error) {
      console.error("Error adding disbursement:", error);
      alert("❌ Failed to add disbursement");
    }
  };

  // Start editing a disbursement amount
  const startEditDisbursement = (disbursement) => {
    setEditingDisbursement(disbursement._id);
    setEditAmount(disbursement.amount?.toString() || "");
  };

  // Cancel editing
  const cancelEditDisbursement = () => {
    setEditingDisbursement(null);
    setEditAmount("");
  };

  // Save edited disbursement amount only
  const saveEditDisbursement = async (disbursementId) => {
    if (!editAmount || parseFloat(editAmount) < 0) {
      alert("Please enter a valid disbursement amount");
      return;
    }

    // Check if customer status is open and disbursement amount is being set to non-zero
    if (form.status === "open" && parseFloat(editAmount) > 0) {
      const shouldClose = window.confirm(
        "⚠️ You are setting a disbursement amount while customer status is 'Open'.\n\n" +
        "Do you want to change customer status to 'Close' before saving this disbursement amount?\n\n" +
        "Click OK to change status to 'Close' and save disbursement amount.\n" +
        "Click Cancel to keep status as 'Open' and cancel amount update."
      );
      
      if (shouldClose) {
        // Update status to close and then update disbursement
        try {
          // First update customer status to close
          await API.put(`/customers/${id}`, { ...form, status: "close" });
          setForm(prev => ({ ...prev, status: "close" }));
          
          // Then update the disbursement amount
          const currentDisbursement = disbursements.find(d => d._id === disbursementId);
          
          if (!currentDisbursement) {
            alert("Disbursement not found in local state");
            return;
          }

          const updateData = {
            amount: parseFloat(editAmount),
            date: currentDisbursement.date,
            notes: currentDisbursement.notes || ""
          };
          
          await API.put(`/customers/${id}/disbursements/${disbursementId}`, updateData);

          setEditingDisbursement(null);
          setEditAmount("");

          await loadDisbursements();
          await loadCustomer();
          alert("✅ Customer status changed to 'Close' and disbursement amount updated successfully!");
          return;
        } catch (error) {
          console.error("Error updating status and disbursement:", error);
          alert("❌ Failed to update status and disbursement amount: " + (error.response?.data?.message || error.message));
          return;
        }
      } else {
        // User cancelled - don't update disbursement amount
        alert("❌ Disbursement amount update cancelled. Customer status remains 'Open'.");
        return;
      }
    }

    // Normal disbursement update (when status is already close or amount is zero)
    try {
      // Get the current disbursement to preserve other fields
      const currentDisbursement = disbursements.find(d => d._id === disbursementId);
      
      if (!currentDisbursement) {
        alert("Disbursement not found in local state");
        return;
      }

      const updateData = {
        amount: parseFloat(editAmount),
        date: currentDisbursement.date,
        notes: currentDisbursement.notes || ""
      };
      
      await API.put(`/customers/${id}/disbursements/${disbursementId}`, updateData);

      setEditingDisbursement(null);
      setEditAmount("");

      await loadDisbursements();
      await loadCustomer();
      alert("✅ Disbursement amount updated successfully!");
    } catch (error) {
      console.error("Error updating disbursement:", error);
      alert("❌ Failed to update disbursement amount: " + (error.response?.data?.message || error.message));
    }
  };

  // Reset all disbursement amounts to zero
  const resetDisbursements = async () => {
    if (!window.confirm("Are you sure you want to reset all disbursement amounts to zero? This will keep all disbursement records but set their amounts to ₹0.")) return;
    
    if (isCustomerClosed) {
      alert("❌ Cannot reset disbursements for a closed customer.");
      return;
    }

    try {
      // Update each disbursement amount to zero
      const updatePromises = disbursements.map(disbursement => {
        return API.put(`/customers/${id}/disbursements/${disbursement._id}`, {
          amount: 0,
          date: disbursement.date,
          notes: disbursement.notes ? `${disbursement.notes} (Amount reset to zero)` : "Amount reset to zero"
        });
      });

      await Promise.all(updatePromises);
      await loadDisbursements();
      await loadCustomer();
      alert("✅ All disbursement amounts reset to zero successfully!");
    } catch (error) {
      console.error("Error resetting disbursements:", error);
      alert("❌ Failed to reset disbursement amounts: " + (error.response?.data?.message || error.message));
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
          You don't have permission to edit customer details.<br />
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
              <b>₹{totalDisbursed.toLocaleString()}</b>.
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            Disbursement Management
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1rem", color: "#666", fontWeight: "bold" }}>
              Total Disbursed: ₹{totalDisbursed.toLocaleString()}
            </span>
            {disbursements.length > 0 && !isCustomerClosed && (
              <button
                className="btn warning"
                onClick={resetDisbursements}
                style={{ padding: "8px 16px" }}
                title="Reset all disbursement amounts to zero"
              >
                🔄 Reset All Amounts
              </button>
            )}
          </div>
        </div>

        {/* Add New Disbursement Form */}
        {!isCustomerClosed && (
          <form onSubmit={addDisbursement} style={{ marginBottom: 20, padding: 16, background: "#f8f9fa", borderRadius: 8 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: "#333" }}>➕ Add New Disbursement</h4>
            {form.status === "open" && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 12,
                  color: "#856404",
                  fontSize: "0.9rem",
                }}
              >
                ⚠️ <strong>Note:</strong> Customer status is currently "Open". Adding a disbursement amount will prompt you to change status to "Close".
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: "0.9rem", fontWeight: "500" }}>Amount (₹)</label>
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
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: "0.9rem", fontWeight: "500" }}>Date</label>
                <input
                  type="date"
                  name="date"
                  value={newDisbursement.date}
                  onChange={handleDisbursementChange}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontSize: "0.9rem", fontWeight: "500" }}>Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={newDisbursement.notes}
                  onChange={handleDisbursementChange}
                  className="input"
                  placeholder="Optional notes"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <button type="submit" className="btn success" style={{ padding: "10px 16px" }}>
                  ➕ Add
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Disbursements List */}
        {disbursements.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd", background: "#f8f9fa" }}>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: "600" }}>Date</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: "600" }}>Amount (₹)</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: "600" }}>Notes</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: "600" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {disbursements
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((d) => (
                    <tr key={d._id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 12 }}>
                        {new Date(d.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 12 }}>
                        {editingDisbursement === d._id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="input"
                              placeholder="Enter amount"
                              required
                              min="0"
                              step="0.01"
                              style={{ width: "120px", padding: "6px" }}
                              autoFocus
                            />
                            <span style={{ color: "#666" }}>₹</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: "500" }}>₹{(d.amount || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td style={{ padding: 12, color: "#666" }}>
                        {d.notes || "-"}
                      </td>
                      <td style={{ padding: 12 }}>
                        {editingDisbursement === d._id ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn success"
                              onClick={() => saveEditDisbursement(d._id)}
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            >
                              💾 Save
                            </button>
                            <button
                              className="btn secondary"
                              onClick={cancelEditDisbursement}
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn primary"
                            onClick={() => startEditDisbursement(d)}
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            disabled={isCustomerClosed}
                            title={
                              isCustomerClosed
                                ? "Cannot edit disbursement for closed customer"
                                : "Edit disbursement amount"
                            }
                          >
                            ✏️ Edit Amount
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#666", padding: 40 }}>
            <p>No disbursements recorded yet.</p>
            {!isCustomerClosed && (
              <p style={{ fontSize: "0.9rem", marginTop: 8 }}>
                Use the form above to add the first disbursement.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}