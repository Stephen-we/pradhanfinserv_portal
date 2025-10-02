// client/src/pages/ViewCustomer.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiEdit, FiX, FiTrash2, FiPlus } from "react-icons/fi";
import API from "../services/api";
import "../styles/viewCustomer.css";

export default function ViewCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [disbursements, setDisbursements] = useState([]);
  const [showDisbursementForm, setShowDisbursementForm] = useState(false);
  const [newDisbursement, setNewDisbursement] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const loadCustomer = async () => {
    try {
      const { data } = await API.get(`/customers/${id}`);
      setCustomer(data);
    } catch (e) {
      alert("Unable to load customer details");
    }
  };

  const loadDisbursements = async () => {
    try {
      const { data } = await API.get(`/customers/${id}/disbursements`);
      setDisbursements(data);
    } catch (e) {
      setDisbursements([]);
    }
  };

  useEffect(() => {
    loadCustomer();
    loadDisbursements();
  }, [id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("photo", file);
    await API.post(`/customers/${id}/photo`, fd);
    loadCustomer();
  };

  const handleRemovePhoto = async () => {
    await API.delete(`/customers/${id}/photo`);
    loadCustomer();
  };

  const handleDisbursementChange = (e) => {
    setNewDisbursement({
      ...newDisbursement,
      [e.target.name]: e.target.value
    });
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
      setShowDisbursementForm(false);
      loadDisbursements();
      loadCustomer(); // Refresh to update total disbursed and status
      alert("✅ Disbursement added successfully!");
    } catch (error) {
      alert("❌ Failed to add disbursement");
    }
  };

  const deleteDisbursement = async (disbursementId) => {
    if (!window.confirm("Are you sure you want to delete this disbursement?")) {
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

  if (!customer) return <div className="customer-profile">Loading...</div>;

  const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
  const isCustomerClosed = customer.status === 'close';

  return (
    <div className="customer-profile">
      {/* Header */}
      <div className="profile-header">
        <h2>Customer Profile</h2>
        <button
          className="icon-btn"
          onClick={() => navigate(`/customers/${id}/edit`)}
        >
          <FiEdit size={20} />
        </button>
      </div>

      {/* Grid Layout */}
      <div className="profile-grid">
        {/* Sidebar */}
        <div className="profile-sidebar" style={{height: 'fit-content', minHeight: '400px'}}>
          <label className="avatar">
            {customer.photo ? (
              <>
                <img
                  src={`http://localhost:5000${customer.photo}`}
                  alt="Profile"
                />
                <button
                  className="remove-photo-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemovePhoto();
                  }}
                >
                  <FiX size={14} />
                </button>
              </>
            ) : (
              <span style={{ fontSize: "12px", color: "#666" }}>No Photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoUpload}
            />
          </label>

          <h3 style={{ marginTop: "15px" }}>{customer.name}</h3>
          <div className="customer-id">ID: {customer.customerId}</div>
          <div>{customer.mobile}</div>
          <div>{customer.email}</div>
        </div>

        {/* Details */}
        <div className="profile-details">
          <div className="detail-card">
            <h4>Channel Partner</h4>
            <p>
              {customer.channelPartner?.name ||
                customer.channelPartner ||
                "N/A"}
            </p>
          </div>
          <div className="detail-card">
            <h4>Bank</h4>
            <p>{customer.bankName || "N/A"}</p>
          </div>
          <div className="detail-card">
            <h4>Status</h4>
            <p className={isCustomerClosed ? "status-close" : "status-open"}>
              {customer.status ? customer.status.toUpperCase() : "OPEN"}
              {isCustomerClosed ? ' 🔒' : ' 🔓'}
            </p>
          </div>
          
          {/* Disbursement Amount Card */}
          <div className="detail-card disbursement-card">
            <div className="disbursement-header">
              <div>
                <h4>Disbursed Amount</h4>
                <span className="status-indicator">
                  Status: {customer.status || 'open'} {isCustomerClosed ? '🔒' : '🔓'}
                </span>
              </div>
              <button 
                className={`icon-btn small ${isCustomerClosed ? 'disabled' : ''}`}
                onClick={() => !isCustomerClosed && setShowDisbursementForm(!showDisbursementForm)}
                title={isCustomerClosed ? "Cannot add disbursement to closed customer" : "Add Disbursement"}
                disabled={isCustomerClosed}
              >
                <FiPlus size={16} />
              </button>
            </div>
            <p className="disbursement-amount">₹{totalDisbursed.toLocaleString()}</p>
            
            {/* Disbursement Form */}
            {showDisbursementForm && !isCustomerClosed && (
              <div className="disbursement-form">
                <form onSubmit={addDisbursement}>
                  <div className="form-group">
                    <input
                      type="number"
                      name="amount"
                      value={newDisbursement.amount}
                      onChange={handleDisbursementChange}
                      className="input"
                      placeholder="Amount"
                      required
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="date"
                      name="date"
                      value={newDisbursement.date}
                      onChange={handleDisbursementChange}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="notes"
                      value={newDisbursement.notes}
                      onChange={handleDisbursementChange}
                      className="input"
                      placeholder="Notes (optional)"
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn secondary"
                      onClick={() => setShowDisbursementForm(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn success">
                      Add Disbursement
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Disbursements List */}
            {disbursements.length > 0 && (
              <div className="disbursements-list">
                <h5>Recent Disbursements:</h5>
                {disbursements.slice(0, 3).map((disbursement) => (
                  <div key={disbursement._id} className="disbursement-item">
                    <span className="disbursement-date">
                      {new Date(disbursement.date).toLocaleDateString()}
                    </span>
                    <span className="disbursement-amount-item">
                      ₹{disbursement.amount.toLocaleString()}
                    </span>
                    <button
                      className={`icon-btn small danger ${isCustomerClosed ? 'disabled' : ''}`}
                      onClick={() => !isCustomerClosed && deleteDisbursement(disbursement._id)}
                      title={isCustomerClosed ? "Cannot delete disbursement from closed customer" : "Delete disbursement"}
                      disabled={isCustomerClosed}
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
                {disbursements.length > 3 && (
                  <button 
                    className="view-all-btn"
                    onClick={() => navigate(`/customers/${id}/edit`)}
                  >
                    View all {disbursements.length} disbursements
                  </button>
                )}
              </div>
            )}

            {disbursements.length === 0 && !showDisbursementForm && (
              <div className="no-disbursements">
                <p>No disbursements recorded yet.</p>
                {!isCustomerClosed && (
                  <button 
                    className="btn success small"
                    onClick={() => setShowDisbursementForm(true)}
                  >
                    <FiPlus size={14} /> Add First Disbursement
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="detail-card">
            <h4>Permanent Address</h4>
            <p>{customer.permanentAddress || "N/A"}</p>
          </div>
          <div className="detail-card">
            <h4>Current Address</h4>
            <p>{customer.currentAddress || "N/A"}</p>
          </div>
          <div className="detail-card">
            <h4>Notes</h4>
            <p>{customer.notes || "No notes available"}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="profile-footer">
        <button className="btn secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="btn" onClick={() => navigate(`/customers/${id}/edit`)}>
          Edit Details
        </button>
      </div>
    </div>
  );
}